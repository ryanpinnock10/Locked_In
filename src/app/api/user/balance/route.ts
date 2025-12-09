import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function GET() {
    try {
        const { userId } = await auth()
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        // Get user from Clerk to get email
        const user = await currentUser()
        if (!user || !user.emailAddresses[0]) {
            return new NextResponse("User not found", { status: 404 })
        }
        const email = user.emailAddresses[0].emailAddress

        // Find or create user in our DB
        let dbUser = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!dbUser) {
            dbUser = await prisma.user.create({
                data: {
                    id: userId,
                    email: email,
                    balance: 0 // Start with $0.00
                }
            })
        }

        return NextResponse.json({ balance: dbUser.balance })
    } catch (error) {
        console.error("[BALANCE_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
