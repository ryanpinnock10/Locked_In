/**
 * Functional audit of the four money-path fixes, run against a real Postgres
 * via the actual Prisma schema. Replicates the route handlers' transactional
 * logic exactly (the only thing stubbed is Clerk auth() and Stripe signature
 * verification, which are not part of the money math being tested).
 */
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const GUEST_LEDGER_ID = "guest_ledger"
const GUEST_LEDGER_EMAIL = "guest-ledger@locked-in.internal"
const COMPLETION_GRACE_SECONDS = 5

let pass = 0, fail = 0
function check(name: string, cond: boolean, detail = "") {
    if (cond) { pass++; console.log(`  PASS  ${name}`) }
    else { fail++; console.log(`  FAIL  ${name}  ${detail}`) }
}

// ---- replicated route logic ----------------------------------------------

async function startSession(userId: string, opts: { intent: string, duration: number, cost: number, mode?: string, startTimeOverride?: Date }) {
    return prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } })
        if (!user || user.balance < opts.cost) return { error: "Insufficient funds", status: 402 as const }
        await tx.transaction.create({ data: { userId, amount: -opts.cost, type: "USAGE", description: `Locked In: ${opts.intent} (${opts.duration}m)` } })
        const session = await tx.focusSession.create({
            data: {
                userId, duration: opts.duration, intent: opts.intent, status: "active",
                mode: opts.mode || "strict", cost: opts.cost,
                ...(opts.startTimeOverride ? { startTime: opts.startTimeOverride } : {}),
            },
        })
        await tx.user.update({ where: { id: userId }, data: { balance: { decrement: opts.cost } } })
        return { session, status: 200 as const }
    })
}

async function endSession(userId: string, sessionId: string, success: boolean) {
    return prisma.$transaction(async (tx) => {
        const existing = await tx.focusSession.findUnique({
            where: { id: sessionId },
            select: { id: true, userId: true, status: true, duration: true, cost: true, startTime: true },
        })
        if (!existing || existing.userId !== userId) return { error: "Session not found", status: 404 as const }
        if (existing.status !== "active") return { session: existing, refunded: 0, status: 200 as const }

        const requiredSeconds = (existing.duration ?? 0) * 60
        const elapsedSeconds = (Date.now() - new Date(existing.startTime).getTime()) / 1000
        const timeRequirementMet = elapsedSeconds >= requiredSeconds - COMPLETION_GRACE_SECONDS
        const didSucceed = success === true && timeRequirementMet
        const finalStatus = didSucceed ? "completed" : "failed"

        const session = await tx.focusSession.update({ where: { id: sessionId }, data: { status: finalStatus, endTime: new Date() } })
        let refunded = 0
        if (didSucceed && existing.cost > 0) {
            await tx.user.update({ where: { id: userId }, data: { balance: { increment: existing.cost } } })
            await tx.transaction.create({ data: { userId, amount: existing.cost, type: "BONUS", description: `Session completed — stake refunded ($${(existing.cost / 100).toFixed(2)})` } })
            refunded = existing.cost
        }
        return { session, refunded, status: 200 as const }
    })
}

async function webhookGuestPayment(credits: number, isGuest: boolean, metadataUserId?: string) {
    if (!credits) return { status: 200, note: "ignored-missing-credits" }
    const isGuestPayment = isGuest || !metadataUserId
    const targetUserId = isGuestPayment ? GUEST_LEDGER_ID : (metadataUserId as string)
    await prisma.$transaction(async (tx) => {
        if (isGuestPayment) {
            await tx.user.upsert({ where: { id: GUEST_LEDGER_ID }, update: {}, create: { id: GUEST_LEDGER_ID, email: GUEST_LEDGER_EMAIL } })
        }
        await tx.user.update({ where: { id: targetUserId }, data: { balance: { increment: credits } } })
        await tx.transaction.create({ data: { userId: targetUserId, amount: credits, type: "PURCHASE", description: isGuestPayment ? `Guest Session Payment ($${(credits / 100).toFixed(2)})` : `Wallet Top Up ($${(credits / 100).toFixed(2)})` } })
        if (isGuestPayment) {
            await tx.user.update({ where: { id: GUEST_LEDGER_ID }, data: { balance: { decrement: credits } } })
            await tx.transaction.create({ data: { userId: GUEST_LEDGER_ID, amount: -credits, type: "USAGE", description: `Guest Session Consumed ($${(credits / 100).toFixed(2)})` } })
        }
    })
    return { status: 200 }
}

// ---- helpers --------------------------------------------------------------
async function mkUser(id: string, balanceCents: number) {
    return prisma.user.upsert({ where: { id }, update: { balance: balanceCents }, create: { id, email: `${id}@test.io`, balance: balanceCents } })
}
async function balance(id: string) { return (await prisma.user.findUnique({ where: { id } }))!.balance }

// ---- tests ----------------------------------------------------------------
async function main() {
    await prisma.transaction.deleteMany({})
    await prisma.focusSession.deleteMany({})
    await prisma.user.deleteMany({})

    console.log("\n== FIX #3: real cost persisted on FocusSession ==")
    await mkUser("u_cost", 1000)
    const s3 = await startSession("u_cost", { intent: "Deep work", duration: 30, cost: 300 })
    if (s3.status === 200) {
        check("cost stored on session equals charged stake", s3.session.cost === 300, `got ${s3.session.cost}`)
        check("balance decremented by stake", (await balance("u_cost")) === 700)
        const usage = await prisma.transaction.findFirst({ where: { userId: "u_cost", type: "USAGE" } })
        check("USAGE transaction recorded as negative", usage!.amount === -300)
    } else check("session started", false, "402")

    console.log("\n== FIX #1: stake refunded on verified completion ==")
    await mkUser("u_ok", 1000)
    // start 1-minute session 90s in the past so the time requirement is satisfied
    const past = new Date(Date.now() - 90 * 1000)
    const s1 = await startSession("u_ok", { intent: "Focus", duration: 1, cost: 200, startTimeOverride: past })
    check("balance after stake deducted", (await balance("u_ok")) === 800)
    const e1 = await endSession("u_ok", (s1 as any).session.id, true)
    check("status completed", (e1 as any).session.status === "completed")
    check("stake refunded amount", (e1 as any).refunded === 200)
    check("wallet restored to original on success", (await balance("u_ok")) === 1000)
    const bonus = await prisma.transaction.findFirst({ where: { userId: "u_ok", type: "BONUS" } })
    check("BONUS refund transaction is positive", bonus!.amount === 200)

    console.log("\n== FIX #1b: failure forfeits stake (no refund) ==")
    await mkUser("u_fail", 1000)
    const past2 = new Date(Date.now() - 90 * 1000)
    const sf = await startSession("u_fail", { intent: "Focus", duration: 1, cost: 200, startTimeOverride: past2 })
    const ef = await endSession("u_fail", (sf as any).session.id, false)
    check("status failed", (ef as any).session.status === "failed")
    check("no refund on failure", (ef as any).refunded === 0)
    check("wallet stays reduced on failure", (await balance("u_fail")) === 800)

    console.log("\n== FIX #1c: idempotency — re-finalizing must not double-refund ==")
    await mkUser("u_idem", 1000)
    const past3 = new Date(Date.now() - 90 * 1000)
    const si = await startSession("u_idem", { intent: "Focus", duration: 1, cost: 200, startTimeOverride: past3 })
    await endSession("u_idem", (si as any).session.id, true)            // first finalize -> refund
    const bAfter1 = await balance("u_idem")
    const e2 = await endSession("u_idem", (si as any).session.id, true) // replay
    check("replay yields no extra refund", (e2 as any).refunded === 0)
    check("balance unchanged on replay", (await balance("u_idem")) === bAfter1)
    const bonusCount = await prisma.transaction.count({ where: { userId: "u_idem", type: "BONUS" } })
    check("exactly one BONUS transaction", bonusCount === 1, `got ${bonusCount}`)

    console.log("\n== FIX #4: server-side timer authority (anti-cheat) ==")
    await mkUser("u_cheat", 1000)
    // start a 30-min session NOW; user immediately claims success
    const sc = await startSession("u_cheat", { intent: "Focus", duration: 30, cost: 300 })
    const ec = await endSession("u_cheat", (sc as any).session.id, true) // claims success after ~0s
    check("early success is forced to FAILED by server", (ec as any).session.status === "failed")
    check("no refund granted for fake completion", (ec as any).refunded === 0)
    check("cheater's wallet stays reduced", (await balance("u_cheat")) === 700)

    console.log("\n== FIX #4b: legitimate completion within grace window ==")
    await mkUser("u_grace", 1000)
    // 1-min session, started 57s ago: 57 >= 60-5(grace)=55 -> should pass
    const sg = await startSession("u_grace", { intent: "Focus", duration: 1, cost: 200, startTimeOverride: new Date(Date.now() - 57 * 1000) })
    const eg = await endSession("u_grace", (sg as any).session.id, true)
    check("near-complete within grace is honored", (eg as any).session.status === "completed")
    check("grace-window refund granted", (eg as any).refunded === 200)

    console.log("\n== SECURITY: IDOR — user cannot finalize another user's session ==")
    await mkUser("u_victim", 1000); await mkUser("u_attacker", 1000)
    const sv = await startSession("u_victim", { intent: "Focus", duration: 1, cost: 200, startTimeOverride: new Date(Date.now() - 90 * 1000) })
    const idor = await endSession("u_attacker", (sv as any).session.id, true) // attacker passes victim's session id
    check("cross-user finalize rejected (404)", (idor as any).status === 404)
    check("victim's session still active", (await prisma.focusSession.findUnique({ where: { id: (sv as any).session.id } }))!.status === "active")
    check("attacker did not gain credits", (await balance("u_attacker")) === 1000)

    console.log("\n== SECURITY: insufficient funds cannot start a session ==")
    await mkUser("u_broke", 100)
    const sb = await startSession("u_broke", { intent: "Focus", duration: 30, cost: 300 })
    check("start rejected when balance < cost", (sb as any).status === 402)
    check("no session row created for broke user", (await prisma.focusSession.count({ where: { userId: "u_broke" } })) === 0)

    console.log("\n== FIX #2: guest payment recorded (was dropped) ==")
    await webhookGuestPayment(250, true, undefined) // guest, no userId
    const ledger = await prisma.user.findUnique({ where: { id: GUEST_LEDGER_ID } })
    check("guest ledger user created", !!ledger)
    const gp = await prisma.transaction.findFirst({ where: { userId: GUEST_LEDGER_ID, type: "PURCHASE" } })
    check("guest PURCHASE recorded as revenue", gp!.amount === 250)
    check("guest spend recognized (net-zero ledger balance)", (await balance(GUEST_LEDGER_ID)) === 0)
    const purchaseSum = await prisma.transaction.aggregate({ where: { type: "PURCHASE" }, _sum: { amount: true } })
    check("admin revenue now includes guest payment", (purchaseSum._sum.amount || 0) >= 250)

    console.log("\n== FIX #2b: authed top-up still works and is not treated as guest ==")
    await mkUser("u_topup", 0)
    await webhookGuestPayment(500, false, "u_topup")
    check("authed wallet credited by top-up", (await balance("u_topup")) === 500)
    const tu = await prisma.transaction.findFirst({ where: { userId: "u_topup", type: "PURCHASE" } })
    check("top-up labeled as wallet top up (not guest)", !!tu && tu.description!.includes("Wallet Top Up"))

    console.log(`\n================  RESULT: ${pass} passed, ${fail} failed  ================\n`)
    await prisma.$disconnect()
    if (fail > 0) process.exit(1)
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
