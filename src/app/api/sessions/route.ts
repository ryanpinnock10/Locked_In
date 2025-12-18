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

        // 1. Create Transaction
        const transaction = await prisma.transaction.create({
            data: {
                userId,
                amount: -cost,
                type: "USAGE",
                description: `Locked In: ${intent || "Focus Session"} (${duration}m)`
            }
        })

        // 2. Create Session
        const session = await prisma.session.create({
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

        // 3. Update User Balance
        await prisma.user.update({
            where: { id: userId },
            data: { balance: { decrement: cost } }
        })

        return NextResponse.json({ session, transaction })
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
