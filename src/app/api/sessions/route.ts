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
                    cost: 0,
                    // In a real app, you'd calculate cost based on duration * rate
                    // For now, we'll handle the transaction separately below
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
        const { sessionId, status, success } = body // Added 'success' to destructuring

        if (!sessionId || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const session = await prisma.focusSession.update({
            where: { id: sessionId, userId }, // Keep userId for security
            data: {
                status: success ? "completed" : "failed", // Use 'success' to determine final status
                endTime: new Date()
            }
        })

        return NextResponse.json(session)
    } catch (error) {
        console.error("[SESSIONS_PATCH] Error:", error)
        return NextResponse.json(
            { error: "Failed to update session" },
            { status: 500 }
        )
    }
}
