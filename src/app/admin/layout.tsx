import { ReactNode } from "react"
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { Button } from "@/components/ui/button"

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

import { useState } from "react"
import { Menu, X } from "lucide-react"

function AdminLayoutClient({ children }: { children: ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    return (
        <div className="flex min-h-screen bg-black text-white relative">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-900/50 backdrop-blur-md border-b border-zinc-800 z-40 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">L</div>
                    <span className="font-bold text-lg tracking-tighter">Admin</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </Button>
            </div>

            {/* Backdrop for mobile */}
            {isSidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <AdminSidebar className={`fixed inset-y-0 left-0 z-50 transition-transform lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`} />

            {/* Main Content */}
            <main className="flex-1 p-8 pt-24 lg:pt-8 overflow-y-auto w-full max-w-[100vw]">
                {children}
            </main>
        </div>
    )
}
