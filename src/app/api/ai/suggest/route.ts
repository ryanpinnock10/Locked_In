import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { auth } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic"

export interface AISuggestion {
    approach: string[]
    blockedApps: string[]
    estimatedDuration: number
    tips: string[]
}

export async function POST(req: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY
    let intent = "Focus Session"

    try {
        const body = await req.json()
        intent = body.intent || "Focus Session"
    } catch (e) {
        console.error("[AI_SUGGEST] Failed to parse request body:", e)
    }

    // Fallback Mock if no key
    if (!apiKey || apiKey === "dummy_key_for_build") {
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

    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

        const prompt = `
        You are a productivity assistant helping users focus on their tasks.
        The user's intent is: "${intent}".
        
        Provide a JSON response with the following schema:
        {
            "approach": ["step 1", "step 2", "step 3", "step 4"], // 3-5 specific steps
            "blockedApps": ["App1", "App2"], // List of apps/sites to avoid
            "estimatedDuration": 45, // Number of minutes (integer)
            "tips": ["Tip 1", "Tip 2"] // 2-3 specific focus tips
        }
        
        Return ONLY valid JSON.
        `

        const result = await model.generateContent(prompt)
        const response = await result.response
        let text = response.text()

        // Clean up markdown code blocks if present
        text = text.replace(/```json/g, "").replace(/```/g, "").trim()

        const suggestion = JSON.parse(text)

        return NextResponse.json(suggestion as AISuggestion)

    } catch (error: any) {
        console.error("[AI_SUGGEST] Gemini Error:", error)

        // Fallback to mock on error
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
}
