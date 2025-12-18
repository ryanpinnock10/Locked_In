import { ReactNode } from "react"
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin/AdminSidebar"

const ADMIN_EMAILS = [
    "ryanpinnock10@gmail.com", // Add your email here
]

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
        <div className="flex min-h-screen bg-black text-white">
            <AdminSidebar />
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    )
}
