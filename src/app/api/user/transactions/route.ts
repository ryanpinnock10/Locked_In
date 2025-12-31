import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const transactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 50
        })

        return NextResponse.json(transactions)
    } catch (error) {
        console.error("[TRANSACTIONS_GET] Error:", error)
        return NextResponse.json(
            { error: "Failed to fetch transactions" },
            { status: 500 }
        )
    }
}
