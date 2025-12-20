import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { intent, duration, cost, aiSuggested, aiApproach, aiBlockedApps, aiTips } = await req.json()
        console.log(`[SESSIONS_POST] Request from ${userId}: cost=${cost}, balance check starting...`)

        // 1. Perform balance check and updates in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { balance: true }
            })

            console.log(`[SESSIONS_POST] User balance: ${user?.balance}, Required: ${cost}`)
            if (!user || user.balance < cost) {
                console.log(`[SESSIONS_POST] Insufficient funds for ${userId}`)
                return { error: "Insufficient funds", status: 402 }
            }

            // Create Transaction record
            const transaction = await tx.transaction.create({
                data: {
                    userId,
                    amount: -cost,
                    type: "USAGE",
                    description: `Locked In: ${intent || "Focus Session"} (${duration}m)`
                }
            })

            // Create Session
            const session = await tx.session.create({
                data: {
                    userId,
                    intent: intent || "Focus Session",
                    duration,
                    cost,
                    status: "active",
                    aiSuggested: !!aiSuggested,
                    aiApproach: aiApproach || [],
                    aiBlockedApps: aiBlockedApps || [],
                    aiTips: aiTips || [],
                }
            })

            // Update User Balance
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

        const { sessionId, status } = await req.json()

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
