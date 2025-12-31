import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = process.env.ADMIN_EMAILS || "ryanpinnock10@gmail.com"

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth()
        const { message } = await req.json()

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 })
        }

        // Save to DB
        await prisma.feedback.create({
            data: {
                message,
                userId: userId || null
            }
        })

        // Send email to admin (optional, keeping it for notifications)
        await resend.emails.send({
            from: 'Locked In Feedback <onboarding@resend.dev>',
            to: ADMIN_EMAIL,
            subject: `New Feedback from ${userId ? "User" : "Guest"}`,
            text: `User ID: ${userId || "Guest"}\n\nFeedback:\n${message}`,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Feedback error:", error)
        return NextResponse.json({ error: "Failed to send feedback" }, { status: 500 })
    }
}

export async function GET() {
    try {
        const feedback = await prisma.feedback.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { email: true } } }
        })
        return NextResponse.json(feedback)
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 })
    }
}
