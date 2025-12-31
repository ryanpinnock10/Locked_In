import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { UAParser } from "ua-parser-js"
import crypto from "crypto"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { url, path, referrer } = body
        const headers = req.headers

        const userAgent = headers.get("user-agent") || ""
        const parser = new UAParser(userAgent)
        const result = parser.getResult()

        const deviceType = result.device.type || "desktop"
        const browser = result.browser.name || "Unknown"
        const os = result.os.name || "Unknown"
        const country = headers.get("x-vercel-ip-country") || "Unknown"

        // Generate a privacy-friendly visitor ID (hash of IP + User Agent + Day)
        // Adding date ensures daily unique visitors, but resets daily to avoid long-term tracking
        const ip = headers.get("x-forwarded-for") || "unknown"
        const dailySalt = new Date().toISOString().slice(0, 10) // "2024-01-01"
        const visitorId = crypto
            .createHash("sha256")
            .update(`${ip}-${userAgent}-${dailySalt}`)
            .digest("hex")

        await prisma.analyticsEvent.create({
            data: {
                url,
                path,
                referrer: referrer || null,
                country,
                device: deviceType,
                browser,
                os,
                visitorId,
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Analytics Error:", error)
        return NextResponse.json({ success: false }, { status: 500 })
    }
}
