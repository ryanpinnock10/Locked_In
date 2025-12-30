import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

interface SessionRequestBody {
    intent: string
    duration: number
    cost: number
    aiSuggested?: boolean
    aiApproach?: string[]
    aiBlockedApps?: string[]
    aiTips?: string[]
    mode?: "strict" | "flexible"
    sessionId?: string
    status?: string
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body: SessionRequestBody = await req.json()
        const { intent, duration, cost, aiSuggested, aiApproach, aiBlockedApps, aiTips, mode } = body

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

            const session = await tx.session.create({
                data: {
                    userId,
                    intent: intent || "Focus Session",
                    duration,
                    cost,
                    mode: mode || "strict",
                    status: "active",
                    aiSuggested: !!aiSuggested,
                    aiApproach: aiApproach || [],
                    aiBlockedApps: aiBlockedApps || [],
                    aiTips: aiTips || [],
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
        const { sessionId, status } = body

        if (!sessionId || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const session = await prisma.session.update({
            where: { id: sessionId, userId },
            data: {
                status,
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
