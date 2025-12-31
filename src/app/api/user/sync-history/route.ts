import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

interface GuestSessionSyncBody {
    sessions: {
        intent: string
        duration: number
        cost: number
        status: 'completed' | 'failed'
        mode: 'strict' | 'flexible'
        completedAt: string
    }[]
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body: GuestSessionSyncBody = await req.json()
        const { sessions } = body

        if (!sessions || sessions.length === 0) {
            return NextResponse.json({ message: "No sessions to sync" })
        }

        console.log(`[SYNC_HISTORY] Syncing ${sessions.length} sessions for user ${userId}`)

        // Use a transaction to create all sessions and transactions
        const result = await prisma.$transaction(async (tx) => {
            let insertedCount = 0

            for (const session of sessions) {
                // Create the session record
                await tx.focusSession.create({
                    data: {
                        userId,
                        intent: session.intent,
                        duration: session.duration,
                        cost: session.cost,
                        status: session.status === 'completed' ? 'active' : 'failed', // Map to DB status
                        startTime: new Date(session.completedAt), // Approximate start time or use completedAt as anchor
                        endTime: new Date(session.completedAt),
                        mode: session.mode
                    }
                })

                // If Completed (Paid/Sucess), record the transaction as verified
                // Note: For Guest sessions, "paid" usually means Stripe Checkout occurred. 
                // We assume cost was handled via stripe checkout for guest start.
                // However, we don't have the STRIPE ID here easily unless we stored it. 
                // For now, we will log a zero-sum transaction or a "Imported" transaction to track value.

                await tx.transaction.create({
                    data: {
                        userId,
                        amount: -session.cost, // Record the "cost" that was theoretically paid
                        type: "USAGE",
                        description: `Imported Guest Session: ${session.intent} (${session.duration}m)`
                    }
                })

                insertedCount++
            }

            return insertedCount
        })

        return NextResponse.json({ success: true, count: result })

    } catch (error) {
        console.error("[SYNC_HISTORY] Error:", error)
        return NextResponse.json(
            { error: "Failed to sync history" },
            { status: 500 }
        )
    }
}
