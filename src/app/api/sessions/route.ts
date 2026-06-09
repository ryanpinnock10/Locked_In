import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

interface SessionRequestBody {
    userId: string
    intent?: string
    duration: number
    mode?: string
    aiSuggested?: boolean
    aiApproach?: string[]
    aiBlockedApps?: string[]
    aiTips?: string[]
    sessionId?: string
    status?: string
    success?: boolean
    cost?: number
}

// Allow a small clock-skew / wind-down grace window (in seconds) so a user who
// finishes a moment early due to client/server clock drift is not denied a refund.
const COMPLETION_GRACE_SECONDS = 5

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body: SessionRequestBody = await req.json()
        const { intent, duration, cost = 0, aiSuggested, aiApproach, aiBlockedApps, aiTips, mode } = body

        console.log(`[SESSIONS_POST] Request from ${userId}: cost=${cost}, mode=${mode || 'strict'}`)

        const result = await prisma.$transaction(async (tx) => {
            // FIX #5 (concurrency): Atomically check-and-decrement the balance in a
            // SINGLE conditional UPDATE. The previous read-then-decrement pattern was
            // a TOCTOU race: under READ COMMITTED, many concurrent starts could all
            // read the same balance, all pass `balance < cost`, and all decrement —
            // overselling and driving the balance negative. `updateMany` with a
            // `balance >= cost` guard compiles to `UPDATE ... WHERE balance >= cost`,
            // which Postgres locks and evaluates atomically per row. If it affects 0
            // rows, the user either doesn't exist or can't afford the stake.
            const charge = await tx.user.updateMany({
                where: { id: userId, balance: { gte: cost } },
                data: { balance: { decrement: cost } },
            })

            if (charge.count === 0) {
                return { error: "Insufficient funds", status: 402 }
            }

            const transaction = await tx.transaction.create({
                data: {
                    userId,
                    amount: -cost,
                    type: "USAGE",
                    description: `Locked In: ${intent || "Focus Session"} (${duration}m)`
                }
            })

            const session = await tx.focusSession.create({
                data: {
                    userId,
                    duration,
                    intent: intent || "Focus Session",
                    status: "active",
                    mode: mode || "strict", // Defaults to strict if not provided
                    aiSuggested: !!aiSuggested,
                    aiApproach: aiApproach || [],
                    aiBlockedApps: aiBlockedApps || [],
                    aiTips: aiTips || [],
                    // FIX #3: Persist the real stake on the session record so admin
                    // revenue analytics reflect what was actually charged (was hardcoded 0).
                    cost,
                    // startTime is set server-side via @default(now()) and is the
                    // source of truth for completion validation (FIX #4).
                }
            })

            return { session, transaction, status: 200 }
        })

        if (result.status === 402) {
            return NextResponse.json({ error: result.error }, { status: 402 })
        }

        return NextResponse.json({ session: result.session, transaction: result.transaction })
    } catch (error) {
        console.error("[SESSIONS_POST] Error:", error)
        return NextResponse.json(
            { error: "Failed to start session" },
            { status: 500 }
        )
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body: SessionRequestBody = await req.json()
        const { sessionId, status, success } = body

        if (!sessionId || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Process the end-of-session inside a transaction so the status flip and
        // any refund are atomic and cannot be partially applied.
        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.focusSession.findUnique({
                where: { id: sessionId },
                select: {
                    id: true,
                    userId: true,
                    status: true,
                    duration: true,
                    cost: true,
                    startTime: true,
                },
            })

            // Ownership + existence check (replaces the old composite-where update).
            if (!existing || existing.userId !== userId) {
                return { error: "Session not found", status: 404 as const }
            }

            // Idempotency (fast path): a session can only be finalized once. This
            // early return short-circuits an already-finalized session, but it is
            // NOT the concurrency guard — see the atomic updateMany below.
            if (existing.status !== "active") {
                return { session: existing, refunded: 0, status: 200 as const }
            }

            // FIX #4: Server-side timer authority. The client asks for "success",
            // but the server independently verifies that enough wall-clock time has
            // actually elapsed since startTime. A client cannot fast-forward the
            // timer or fake a completion to reclaim its stake.
            const requiredSeconds = (existing.duration ?? 0) * 60
            const elapsedSeconds = (Date.now() - new Date(existing.startTime).getTime()) / 1000
            const timeRequirementMet =
                elapsedSeconds >= requiredSeconds - COMPLETION_GRACE_SECONDS

            // A session only truly succeeds if the client reported success AND the
            // server agrees the full duration elapsed.
            const didSucceed = success === true && timeRequirementMet
            const finalStatus = didSucceed ? "completed" : "failed"

            // FIX #5 (concurrency): Atomically flip active -> final state and use the
            // affected-row count as the idempotency gate. The previous
            // read-status-then-update pattern was a TOCTOU race: under READ COMMITTED,
            // many concurrent finalizes could all read status === "active", all pass
            // the guard above, and all issue a refund (double/N-times refund). By
            // making the status transition a single conditional UPDATE
            // (`WHERE id = ? AND status = 'active'`), Postgres guarantees exactly ONE
            // concurrent caller wins (count === 1) and performs the refund; every
            // other racer affects 0 rows and skips the refund.
            const claim = await tx.focusSession.updateMany({
                where: { id: sessionId, status: "active" },
                data: { status: finalStatus, endTime: new Date() },
            })

            if (claim.count === 0) {
                // Lost the race: another concurrent request already finalized this
                // session. Return the current state without refunding again.
                const current = await tx.focusSession.findUnique({ where: { id: sessionId } })
                return { session: current, refunded: 0, status: 200 as const }
            }

            const session = await tx.focusSession.findUnique({ where: { id: sessionId } })

            // FIX #1: Refund the stake on a verified successful completion.
            // The stake was deducted at start (USAGE). On success we credit it back
            // so "complete the timer -> credits returned to wallet" actually works.
            // On failure, nothing is refunded (the stake is forfeited as designed).
            let refunded = 0
            if (didSucceed && existing.cost > 0) {
                await tx.user.update({
                    where: { id: userId },
                    data: { balance: { increment: existing.cost } },
                })

                await tx.transaction.create({
                    data: {
                        userId,
                        amount: existing.cost, // positive = credit back to wallet
                        type: "BONUS",
                        description: `Session completed — stake refunded ($${(existing.cost / 100).toFixed(2)})`,
                    },
                })

                refunded = existing.cost
            }

            return { session, refunded, status: 200 as const }
        })

        if (result.status === 404) {
            return NextResponse.json({ error: result.error }, { status: 404 })
        }

        return NextResponse.json({ session: result.session, refunded: result.refunded })
    } catch (error) {
        console.error("[SESSIONS_PATCH] Error:", error)
        return NextResponse.json(
            { error: "Failed to update session" },
            { status: 500 }
        )
    }
}
