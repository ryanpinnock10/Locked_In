/**
 * Concurrency / ledger stress test against a REAL Postgres.
 *
 * This harness re-implements the exact money-path transaction logic from
 * src/app/api/sessions/route.ts (POST = start/charge, PATCH = finalize/refund)
 * but invokes it directly against Prisma so we can fire hundreds of concurrent
 * operations without going through Clerk auth.
 *
 * Invariants under test:
 *   I1. No overspend: concurrent starts must never drive a balance negative.
 *   I2. No double-refund: concurrent finalizations of the SAME session refund
 *       the stake at most once (idempotency holds under a race).
 *   I3. Ledger consistency: at all times balance == initial + Σ(transaction.amount).
 *
 * Run: npx tsx tests/stress.test.ts
 */
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const COMPLETION_GRACE_SECONDS = 5

let passed = 0
let failed = 0
function assert(cond: boolean, msg: string) {
    if (cond) {
        passed++
        console.log(`  ✓ ${msg}`)
    } else {
        failed++
        console.error(`  ✗ FAIL: ${msg}`)
    }
}

// ---- Money-path logic mirrored from route.ts ----

async function startSession(userId: string, cost: number, duration: number) {
    return prisma.$transaction(async (tx) => {
        // Atomic check-and-decrement (mirrors route.ts FIX #5).
        const charge = await tx.user.updateMany({
            where: { id: userId, balance: { gte: cost } },
            data: { balance: { decrement: cost } },
        })
        if (charge.count === 0) {
            return { error: "Insufficient funds", status: 402 as const }
        }
        const transaction = await tx.transaction.create({
            data: { userId, amount: -cost, type: "USAGE", description: `stress start` },
        })
        const session = await tx.focusSession.create({
            data: {
                userId,
                duration,
                intent: "stress",
                status: "active",
                mode: "strict",
                aiApproach: [],
                aiBlockedApps: [],
                aiTips: [],
                cost,
            },
        })
        return { session, transaction, status: 200 as const }
    })
}

async function finalizeSession(userId: string, sessionId: string, success: boolean) {
    return prisma.$transaction(async (tx) => {
        const existing = await tx.focusSession.findUnique({
            where: { id: sessionId },
            select: { id: true, userId: true, status: true, duration: true, cost: true, startTime: true },
        })
        if (!existing || existing.userId !== userId) {
            return { error: "Session not found", status: 404 as const }
        }
        // Idempotency fast path (not the concurrency guard).
        if (existing.status !== "active") {
            return { session: existing, refunded: 0, status: 200 as const }
        }
        const requiredSeconds = (existing.duration ?? 0) * 60
        const elapsedSeconds = (Date.now() - new Date(existing.startTime).getTime()) / 1000
        const timeRequirementMet = elapsedSeconds >= requiredSeconds - COMPLETION_GRACE_SECONDS
        const didSucceed = success === true && timeRequirementMet
        const finalStatus = didSucceed ? "completed" : "failed"

        // Atomic claim: only the racer that flips active->final (count===1) refunds.
        const claim = await tx.focusSession.updateMany({
            where: { id: sessionId, status: "active" },
            data: { status: finalStatus, endTime: new Date() },
        })
        if (claim.count === 0) {
            const current = await tx.focusSession.findUnique({ where: { id: sessionId } })
            return { session: current, refunded: 0, status: 200 as const }
        }
        const session = await tx.focusSession.findUnique({ where: { id: sessionId } })

        let refunded = 0
        if (didSucceed && existing.cost > 0) {
            await tx.user.update({
                where: { id: userId },
                data: { balance: { increment: existing.cost } },
            })
            await tx.transaction.create({
                data: { userId, amount: existing.cost, type: "BONUS", description: `stress refund` },
            })
            refunded = existing.cost
        }
        return { session, refunded, status: 200 as const }
    })
}

// ---- Helpers ----

async function ledgerSum(userId: string): Promise<number> {
    const agg = await prisma.transaction.aggregate({
        where: { userId },
        _sum: { amount: true },
    })
    return agg._sum.amount ?? 0
}

async function makeUser(id: string, balance: number) {
    await prisma.user.upsert({
        where: { id },
        update: { balance },
        create: { id, email: `${id}@stress.local`, balance },
    })
}

async function cleanup(ids: string[]) {
    await prisma.transaction.deleteMany({ where: { userId: { in: ids } } })
    await prisma.focusSession.deleteMany({ where: { userId: { in: ids } } })
    await prisma.user.deleteMany({ where: { id: { in: ids } } })
}

// ---- Tests ----

async function testOverspend() {
    console.log("\n[I1] Overspend race: 200 concurrent starts, balance only covers 10")
    const uid = "stress_overspend"
    const STAKE = 100 // $1.00
    const STARTS = 200
    const AFFORDABLE = 10
    await makeUser(uid, STAKE * AFFORDABLE)

    const results = await Promise.allSettled(
        Array.from({ length: STARTS }, () => startSession(uid, STAKE, 25))
    )
    const ok = results.filter(
        (r) => r.status === "fulfilled" && (r.value as any).status === 200
    ).length
    const rejected = results.filter(
        (r) => r.status === "fulfilled" && (r.value as any).status === 402
    ).length

    const user = await prisma.user.findUnique({ where: { id: uid }, select: { balance: true } })
    const sum = await ledgerSum(uid)

    console.log(`     succeeded=${ok} rejected(402)=${rejected} finalBalance=${user?.balance} ledgerSum=${sum}`)
    assert(ok === AFFORDABLE, `exactly ${AFFORDABLE} starts succeeded (got ${ok}) — no oversell`)
    assert((user?.balance ?? -1) === 0, `final balance is exactly 0 (got ${user?.balance}) — never went negative`)
    assert((user?.balance ?? -1) >= 0, `balance never negative`)
    assert((STAKE * AFFORDABLE) + sum === (user?.balance ?? -999), `ledger consistent: initial + Σtx == balance`)
    await cleanup([uid])
}

async function testDoubleRefund() {
    console.log("\n[I2] Double-refund race: 50 concurrent finalizes of the SAME completed session")
    const uid = "stress_refund"
    const STAKE = 500 // $5.00
    await makeUser(uid, STAKE)

    // Start one 0-minute session so the time requirement is trivially met.
    const start = (await startSession(uid, STAKE, 0)) as any
    const sessionId = start.session.id
    const balanceAfterStart = (await prisma.user.findUnique({ where: { id: uid }, select: { balance: true } }))!.balance
    assert(balanceAfterStart === 0, `balance is 0 after staking $5 (got ${balanceAfterStart})`)

    // Fire 50 concurrent "success" finalizations of the same session.
    const results = await Promise.allSettled(
        Array.from({ length: 50 }, () => finalizeSession(uid, sessionId, true))
    )
    const totalRefunded = results.reduce((acc, r) => {
        if (r.status === "fulfilled") return acc + ((r.value as any).refunded ?? 0)
        return acc
    }, 0)

    const user = await prisma.user.findUnique({ where: { id: uid }, select: { balance: true } })
    const bonusCount = await prisma.transaction.count({ where: { userId: uid, type: "BONUS" } })
    const sum = await ledgerSum(uid)

    console.log(`     totalRefundedReported=${totalRefunded} bonusTxRows=${bonusCount} finalBalance=${user?.balance} ledgerSum=${sum}`)
    assert(totalRefunded === STAKE, `stake refunded exactly once across 50 races (got ${totalRefunded})`)
    assert(bonusCount === 1, `exactly 1 BONUS refund row written (got ${bonusCount}) — no duplicate refund ledger entries`)
    assert((user?.balance ?? -1) === STAKE, `balance back to exactly $5.00 (got ${user?.balance})`)
    assert(sum === 0, `ledger nets to 0 (staked -500, refunded +500); got ${sum}`)
    await cleanup([uid])
}

async function testMixedChaos() {
    console.log("\n[I3] Mixed chaos: 50 users, each does start→finalize concurrently (random success)")
    const N = 50
    const STAKE = 250
    const ids = Array.from({ length: N }, (_, i) => `stress_chaos_${i}`)
    await Promise.all(ids.map((id) => makeUser(id, STAKE)))

    // Each user starts a 0-min session, then immediately finalizes with random success.
    await Promise.allSettled(
        ids.map(async (id) => {
            const s = (await startSession(id, STAKE, 0)) as any
            if (s.status !== 200) return
            const succeed = Math.random() < 0.5
            // Double-finalize to also exercise idempotency in the chaos run.
            await Promise.allSettled([
                finalizeSession(id, s.session.id, succeed),
                finalizeSession(id, s.session.id, succeed),
            ])
        })
    )

    // For every user, balance must equal initial + ledger sum, and be one of {0, STAKE}.
    let allConsistent = true
    let badBalance = false
    for (const id of ids) {
        const u = await prisma.user.findUnique({ where: { id }, select: { balance: true } })
        const sum = await ledgerSum(id)
        const bal = u?.balance ?? -999
        if (STAKE + sum !== bal) { allConsistent = false; console.error(`     ${id}: ${STAKE}+${sum} != ${bal}`) }
        if (bal !== 0 && bal !== STAKE) { badBalance = true; console.error(`     ${id}: anomalous balance ${bal}`) }
        if (bal < 0) badBalance = true
    }
    assert(allConsistent, `all ${N} users: initial + Σtx == balance (ledger never drifts)`)
    assert(!badBalance, `all ${N} users: balance ∈ {0 (forfeited), ${STAKE} (refunded)}, never negative/duplicated`)

    // No session left in 'active' (every finalize must resolve to completed/failed).
    const stuckActive = await prisma.focusSession.count({ where: { userId: { in: ids }, status: "active" } })
    assert(stuckActive === 0, `no sessions stuck in 'active' after finalize (got ${stuckActive})`)
    await cleanup(ids)
}

async function main() {
    console.log("=== Locked In — Concurrency / Ledger Stress Test (real Postgres) ===")
    const t0 = Date.now()
    try {
        await testOverspend()
        await testDoubleRefund()
        await testMixedChaos()
    } catch (e) {
        console.error("FATAL during stress run:", e)
        failed++
    } finally {
        await prisma.$disconnect()
    }
    const dt = ((Date.now() - t0) / 1000).toFixed(1)
    console.log(`\n=== Result: ${passed} passed, ${failed} failed (${dt}s) ===`)
    process.exit(failed === 0 ? 0 : 1)
}

main()
