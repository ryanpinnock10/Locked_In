import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const sessions = await prisma.focusSession.findMany({
            where: { userId },
            orderBy: { startTime: "desc" }
        })

        return NextResponse.json(sessions)
    } catch (error) {
        console.error("[SESSIONS_GET] Error:", error)
        return NextResponse.json(
            { error: "Failed to fetch sessions" },
            { status: 500 }
        )
    }
}
