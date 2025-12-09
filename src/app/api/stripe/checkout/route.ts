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
            return new NextResponse("Unauthorized", { status: 401 })
        }

        // Validate amount (must be one of the allowed options to prevent manipulation)
        const allowedAmounts = [500, 1000, 2000] // $5, $10, $20
        if (!allowedAmounts.includes(amount)) {
            return new NextResponse("Invalid amount", { status: 400 })
        }

        // 1. Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `${amount / 100} Focus Credits`,
                            description: `Load $${amount / 100}.00 into your wallet`,
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${settingsUrl}/?success=true`,
            cancel_url: `${settingsUrl}/?canceled=true`,
            metadata: {
                userId: userId, // Pass Clerk User ID to webhook
                credits: amount.toString()
            }
        })

        return NextResponse.json({ url: session.url })
    } catch (error) {
        console.error("[STRIPE_CHECKOUT]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
