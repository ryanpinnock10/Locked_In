import { ReactNode } from "react"
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",")

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
        redirect("/")
    }

    const userEmail = user.emailAddresses[0]?.emailAddress
    if (!ADMIN_EMAILS.includes(userEmail)) {
        redirect("/")
    }

    return (
        <AdminLayoutClient>{children}</AdminLayoutClient>
    )
}
