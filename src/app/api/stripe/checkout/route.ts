import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { stripe } from "@/lib/stripe"
import prisma from "@/lib/prisma"

const settingsUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"

export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        const user = await currentUser()
        const { amount } = await req.json()

        if (!userId || !user) {
            console.error("[STRIPE_CHECKOUT] Unauthorized: Missing userId or user")
            return NextResponse.json({ error: "Unauthorized. Please sign in again." }, { status: 401 })
        }

        // Validate amount (minimum $1.00 / 100 cents)
        const amountCents = Math.round(Number(amount))
        if (!amountCents || typeof amountCents !== 'number' || amountCents < 100) {
            console.error("[STRIPE_CHECKOUT] Invalid amount:", amount)
            return NextResponse.json({ error: "Invalid amount. Minimum is $1.00." }, { status: 400 })
        }

        // 1. Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `${amountCents / 100} Focus Credits`,
                            description: `Load $${(amountCents / 100).toFixed(2)} into your wallet`,
                        },
                        unit_amount: amountCents,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${settingsUrl}/?success=true`,
            cancel_url: `${settingsUrl}/?canceled=true`,
            metadata: {
                userId: userId, // Pass Clerk User ID to webhook
                credits: amountCents.toString()
            }
        })

        return NextResponse.json({ url: session.url })
    } catch (error: any) {
        console.error("[STRIPE_CHECKOUT] Error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
