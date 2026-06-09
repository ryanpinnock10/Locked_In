import { google } from "@ai-sdk/google"
import { streamText } from "ai"
import prisma from "@/lib/prisma"
import { checkAdmin } from "@/lib/admin-auth"
import { NextResponse } from "next/server"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
    try {
        // Admin guard via the shared helper (DB role OR ADMIN_EMAILS allowlist).
        const admin = await checkAdmin()
        if (!admin.ok) {
            return new NextResponse(admin.status === 401 ? "Unauthorized" : "Forbidden", { status: admin.status })
        }

        // 1. Fetch Stats
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

        const sessions = await prisma.focusSession.findMany({
            where: { startTime: { gte: thirtyDaysAgo } },
            select: { status: true, duration: true, mode: true, cost: true }
        })

        const feedback = await prisma.feedback.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: { message: true, createdAt: true }
        })

        // 2. Aggregate Data
        const totalSessions = sessions.length
        const failedSessions = sessions.filter(s => s.status === "failed").length
        const failureRate = totalSessions > 0 ? Math.round((failedSessions / totalSessions) * 100) : 0
        const flexibleMode = sessions.filter(s => s.mode === "flexible").length
        const strictMode = sessions.filter(s => s.mode === "strict").length

        // 3. Construct Prompt
        const prompt = `
            You are a ruthless business intelligence analyst for "Locked In", an aggressive productivity app that charges users money when they get distracted.
            
            Generate a "Threat Report" based on the last 30 days of data:
            - Total Sessions: ${totalSessions}
            - Failure Rate (Revenue Generator): ${failureRate}%
            - Mode Split: ${strictMode} Strict vs ${flexibleMode} Flexible
            - Recent User Feedback:
            ${feedback.map(f => `- "${f.message}" (${f.createdAt.toISOString().split('T')[0]})`).join('\n')}

            Your report must include:
            1. **The Verdict**: One sentence summary of the business health.
            2. **Key Threats**: 2-3 bullet points on churn risks or user dissatisfaction.
            3. **Revenue Opportunities**: Where can we squeeze more money/optimization?
            4. **Competition Analysis**: Infer potential threats from user feedback or general market trends for focus apps.

            Tone: Professional but aggressive, focusing on retention and monetization.
        `

        // 4. Stream Response via Vercel AI SDK
        const result = streamText({
            model: google('gemini-1.5-pro'),
            prompt: prompt,
        })

        return result.toTextStreamResponse()

    } catch (error) {
        console.error("Threat Report Error:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
