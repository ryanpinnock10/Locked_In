import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const { amount, description, type } = body

        if (!amount || amount <= 0) {
            return new NextResponse("Invalid amount", { status: 400 })
        }

        // Start a transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // 1. Get current user to check balance
            const user = await tx.user.findUnique({
                where: { id: userId }
            })

            if (!user) {
                throw new Error("User not found")
            }

            if (user.balance < amount) {
                throw new Error("Insufficient funds")
            }

            // 2. Deduct balance
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { balance: { decrement: amount } }
            })

            // 3. Record transaction
            await tx.transaction.create({
                data: {
                    userId: userId,
                    amount: -amount, // Negative for spending
                    type: type || "USAGE",
                    description: description || "Session Cost"
                }
            })

            return updatedUser
        })

        return NextResponse.json({ success: true, newBalance: result.balance })

    } catch (error: any) {
        console.error("[TRANSACTION_POST]", error)
        if (error.message === "Insufficient funds") {
            return new NextResponse("Insufficient funds", { status: 402 }) // 402 Payment Required
        }
        return new NextResponse("Internal Error", { status: 500 })
    }
}
