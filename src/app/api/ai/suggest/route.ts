import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic"

export interface AISuggestion {
    approach: string[]
    blockedApps: string[]
    estimatedDuration: number
    tips: string[]
}

export async function POST(req: NextRequest) {
    const apiKey = process.env.OPENAI_API_KEY
    let intent = "Focus Session"

    try {
        const body = await req.json()
        intent = body.intent || "Focus Session"
    } catch (e) {
        console.error("[AI_SUGGEST] Failed to parse request body:", e)
    }

    // Use Mock only if API key is missing or clearly a dummy
    if (!apiKey || apiKey === "dummy_key_for_build" || !apiKey.startsWith("sk-")) {
        // Simulate a small delay for "AI thinking" effect
        await new Promise(resolve => setTimeout(resolve, 1500))

        const mockSuggestion: AISuggestion = {
            approach: [
                `Clarify the core objective of "${intent}"`,
                "Set up a dedicated workspace without distractions",
                "Break the task into 15-minute high-intensity sprints",
                "Review progress and adjust approach if needed"
            ],
            blockedApps: ["Instagram", "Twitter", "YouTube", "Discord"],
            estimatedDuration: 45,
            tips: [
                "Turn off all non-essential notifications.",
                "Use the Pomodoro technique (25m work / 5m break).",
                "Keep a glass of water nearby to stay hydrated."
            ]
        }

        return NextResponse.json(mockSuggestion)
    }

    const openai = new OpenAI({
        apiKey: apiKey,
    })

    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!intent || typeof intent !== "string") {
            return NextResponse.json({ error: "Invalid intent" }, { status: 400 })
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a productivity assistant helping users focus on their tasks. 
Given a task/intent, provide actionable suggestions in JSON format with:
- approach: array of 3-5 specific steps to accomplish the task
- blockedApps: array of apps/websites that should be blocked during focus (e.g., "Instagram", "Twitter", "YouTube")
- estimatedDuration: suggested duration in minutes (15-120)
- tips: array of 2-3 focus tips specific to this task

Be concise and practical. Focus on productivity and deep work principles.`
                },
                {
                    role: "user",
                    content: `Task: ${intent}`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        })

        const suggestion = JSON.parse(completion.choices[0].message.content || "{}")

        return NextResponse.json(suggestion as AISuggestion)
    } catch (error: any) {
        console.error("[AI_SUGGEST] Error:", error)

        // Transparent fallback to mock data if quota exceeded or other API errors
        if (error.status === 429 || error.code === 'insufficient_quota' || error.message?.includes('insufficient_quota')) {
            const mockSuggestion: AISuggestion = {
                approach: [
                    `Clarify the core objective of "${intent}"`,
                    "Set up a dedicated workspace without distractions",
                    "Break the task into 15-minute high-intensity sprints",
                    "Review progress and adjust approach if needed"
                ],
                blockedApps: ["Instagram", "Twitter", "YouTube", "Discord"],
                estimatedDuration: 45,
                tips: [
                    "Turn off all non-essential notifications.",
                    "Use the Pomodoro technique (25m work / 5m break).",
                    "Keep a glass of water nearby to stay hydrated."
                ]
            }
            return NextResponse.json(mockSuggestion)
        }

        return NextResponse.json(
            { error: "Failed to generate suggestions" },
            { status: 500 }
        )
    }
}
