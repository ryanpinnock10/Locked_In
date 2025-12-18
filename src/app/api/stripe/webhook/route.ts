import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
    const body = await req.text()
    const signature = (await headers()).get("Stripe-Signature") as string

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch (error: any) {
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
    }

    const session = event.data.object as Stripe.Checkout.Session

    if (event.type === "checkout.session.completed") {
        const userId = session.metadata?.userId
        const credits = parseInt(session.metadata?.credits || "0")

        if (!userId || !credits) {
            return new NextResponse("Webhook Error: Missing metadata", { status: 400 })
        }

        // Update User Balance
        await prisma.$transaction(async (tx) => {
            // 1. Add funds
            await tx.user.update({
                where: { id: userId },
                data: { balance: { increment: credits } }
            })

            // 2. Record Transaction
            await tx.transaction.create({
                data: {
                    userId: userId,
                    amount: credits,
                    type: "PURCHASE",
                    description: `Wallet Top Up ($${(credits / 100).toFixed(2)})`
                }
            })
        })
    }

    return new NextResponse(null, { status: 200 })
}
