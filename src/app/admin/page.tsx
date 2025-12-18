import { Card } from "@/components/ui/card"
import { Users, Clock, DollarSign, TrendingUp } from "lucide-react"
import prisma from "@/lib/prisma"

async function getStats() {
    // These are placeholder queries - will need to be refined based on actual data structure
    const totalUsers = await prisma.user.count()
    const totalSessions = await prisma.transaction.count({
        where: { type: "USAGE" }
    })
    const totalRevenue = await prisma.transaction.aggregate({
        where: { type: "PURCHASE" },
        _sum: { amount: true }
    })

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const activeToday = await prisma.transaction.groupBy({
        by: ['userId'],
        where: {
            type: "USAGE",
            createdAt: {
                gte: twentyFourHoursAgo
            }
        }
    }).then(res => res.length)

    return {
        totalUsers,
        totalSessions,
        totalRevenue: (totalRevenue?._sum?.amount || 0) / 100, // Convert cents to dollars
        activeToday
    }
}

export default async function AdminOverview() {
    const stats = await getStats()

    const cards = [
        { name: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-400" },
        { name: "Total Sessions", value: stats.totalSessions, icon: Clock, color: "text-purple-400" },
        { name: "Total Revenue", value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-green-400" },
        { name: "Active Today", value: stats.activeToday, icon: TrendingUp, color: "text-orange-400" },
    ]

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                <p className="text-zinc-400">Real-time performance metrics for Locked In.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card) => {
                    const Icon = card.icon
                    return (
                        <Card key={card.name} className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-400 text-sm font-medium">{card.name}</span>
                                <Icon className={`w-5 h-5 ${card.color}`} />
                            </div>
                            <div className="text-2xl font-bold">{card.value}</div>
                        </Card>
                    )
                })}
            </div>

            {/* Placeholder for Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 p-6 h-80 flex items-center justify-center text-zinc-500">
                    User Growth Chart (Coming Soon)
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-6 h-80 flex items-center justify-center text-zinc-500">
                    Revenue Chart (Coming Soon)
                </Card>
            </div>
        </div>
    )
}
