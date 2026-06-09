import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import prisma from "@/lib/prisma"

// Stable identity used to attribute guest (no-account) payments. Guests pay
// per-session via Stripe with no Clerk userId, but the Transaction model
// requires a userId FK. We funnel all guest revenue into a single reserved
// "guest ledger" user so guest payments are still recorded and visible in
// admin revenue analytics (FIX #2). This row is created lazily on first use.
const GUEST_LEDGER_ID = "guest_ledger"
const GUEST_LEDGER_EMAIL = "guest-ledger@locked-in.internal"

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

    console.log(`[STRIPE_WEBHOOK] Received event: ${event.type}`)

    if (event.type === "checkout.session.completed") {
        const metadataUserId = session.metadata?.userId
        const credits = parseInt(session.metadata?.credits || "0")
        const isGuest = session.metadata?.isGuest === "true"

        console.log(
            `[STRIPE_WEBHOOK] Completed checkout — userId: ${metadataUserId || "(guest)"}, credits: ${credits}, isGuest: ${isGuest}`
        )

        // We must always have a credits amount to record anything meaningful.
        if (!credits) {
            console.error("[STRIPE_WEBHOOK] Missing credits in metadata:", session.metadata)
            // 200 so Stripe does not retry an event we can never satisfy.
            return new NextResponse("Ignored: missing credits metadata", { status: 200 })
        }

        // FIX #2: Previously this returned 400 whenever userId was empty, which is
        // ALWAYS the case for guest checkouts. That dropped every guest payment and
        // caused Stripe to retry the webhook indefinitely. We now handle guests by
        // attributing the payment to the reserved guest ledger user.
        const isGuestPayment = isGuest || !metadataUserId
        const targetUserId = isGuestPayment ? GUEST_LEDGER_ID : (metadataUserId as string)

        try {
            await prisma.$transaction(async (tx) => {
                if (isGuestPayment) {
                    // Ensure the reserved guest ledger user exists (idempotent).
                    await tx.user.upsert({
                        where: { id: GUEST_LEDGER_ID },
                        update: {},
                        create: {
                            id: GUEST_LEDGER_ID,
                            email: GUEST_LEDGER_EMAIL,
                        },
                    })
                }

                // 1. Add funds to the relevant wallet (guest ledger or real user).
                //    For guests this acts as a revenue ledger; their session itself
                //    is enforced client-side and is fully prepaid.
                const updatedUser = await tx.user.update({
                    where: { id: targetUserId },
                    data: { balance: { increment: credits } },
                })

                console.log(
                    `[STRIPE_WEBHOOK] Balance for ${targetUserId} is now ${updatedUser.balance}`
                )

                // 2. Record the purchase transaction so it appears in revenue.
                await tx.transaction.create({
                    data: {
                        userId: targetUserId,
                        amount: credits,
                        type: "PURCHASE",
                        description: isGuestPayment
                            ? `Guest Session Payment ($${(credits / 100).toFixed(2)})`
                            : `Wallet Top Up ($${(credits / 100).toFixed(2)})`,
                    },
                })

                // 3. For guest one-shot sessions, immediately recognize the spend so
                //    the guest ledger balance does not accumulate as a phantom
                //    liability (guests cannot withdraw a wallet balance).
                if (isGuestPayment) {
                    await tx.user.update({
                        where: { id: GUEST_LEDGER_ID },
                        data: { balance: { decrement: credits } },
                    })

                    await tx.transaction.create({
                        data: {
                            userId: GUEST_LEDGER_ID,
                            amount: -credits,
                            type: "USAGE",
                            description: `Guest Session Consumed ($${(credits / 100).toFixed(2)})`,
                        },
                    })
                }
            })
        } catch (dbError) {
            console.error("[STRIPE_WEBHOOK] Database update failed:", dbError)
            // 500 so Stripe retries a genuinely transient DB failure.
            return new NextResponse("Database Error", { status: 500 })
        }
    }

    return new NextResponse(null, { status: 200 })
}
