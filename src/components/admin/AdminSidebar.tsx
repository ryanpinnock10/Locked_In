"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Clock, DollarSign, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Sessions", href: "/admin/sessions", icon: Clock },
    { name: "Revenue", href: "/admin/revenue", icon: DollarSign },
]

export function AdminSidebar() {
    const pathname = usePathname()

    return (
        <aside className="w-64 border-r border-zinc-800 flex flex-col gap-8 p-6">
            <div className="flex items-center gap-2 px-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">L</div>
                <span className="font-bold text-xl tracking-tighter">Admin Panel</span>
            </div>

            <nav className="flex-1 flex flex-col gap-2">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                        <Link key={item.name} href={item.href}>
                            <Button
                                variant="ghost"
                                className={`w-full justify-start gap-3 ${isActive
                                        ? "bg-zinc-800 text-white"
                                        : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {item.name}
                            </Button>
                        </Link>
                    )
                })}
            </nav>

            <div className="pt-6 border-t border-zinc-800">
                <Link href="/">
                    <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-400 hover:text-white">
                        <LogOut className="w-4 h-4" />
                        Back to App
                    </Button>
                </Link>
            </div>
        </aside>
    )
}
