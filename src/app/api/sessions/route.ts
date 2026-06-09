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
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { balance: true }
            })

            if (!user || user.balance < cost) {
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

            await tx.user.update({
                where: { id: userId },
                data: { balance: { decrement: cost } }
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

            // Idempotency: a session can only be finalized once. Re-finalizing must
            // never trigger a second refund.
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

            const session = await tx.focusSession.update({
                where: { id: sessionId },
                data: {
                    status: finalStatus,
                    endTime: new Date(),
                },
            })

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
