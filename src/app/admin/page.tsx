import { Card } from "@/components/ui/card"
import { Users, Clock, DollarSign, TrendingUp } from "lucide-react"
import prisma from "@/lib/prisma"
import { UserGrowthChart } from "@/components/admin/UserGrowthChart"
import { RevenueChart } from "@/components/admin/RevenueChart"

async function getStats() {
    const totalUsers = await prisma.user.count()
    const totalSessions = await prisma.transaction.count({
        where: { type: "USAGE" }
    })
    const totalRevenue = await prisma.transaction.aggregate({
        where: { type: "PURCHASE" },
        _sum: { amount: true }
    })

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Monthly stats for charts
    const usersByDay = await prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' }
    })

    const revenueByDay = await prisma.transaction.findMany({
        where: {
            type: "PURCHASE",
            createdAt: { gte: thirtyDaysAgo }
        },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: 'asc' }
    })

    // Process data for Recharts
    const processUserGrowth = () => {
        const days: Record<string, number> = {}
        for (let i = 0; i < 30; i++) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            days[date] = 0
        }
        usersByDay.forEach(u => {
            const date = u.createdAt.toISOString().split('T')[0]
            if (days[date] !== undefined) days[date]++
        })
        return Object.entries(days).map(([date, count]) => ({ date, count })).reverse()
    }

    const processRevenue = () => {
        const days: Record<string, number> = {}
        for (let i = 0; i < 30; i++) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            days[date] = 0
        }
        revenueByDay.forEach(r => {
            const date = r.createdAt.toISOString().split('T')[0]
            if (days[date] !== undefined) days[date] += r.amount / 100
        })
        return Object.entries(days).map(([date, amount]) => ({ date, amount })).reverse()
    }

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
        totalRevenue: (totalRevenue?._sum?.amount || 0) / 100,
        activeToday,
        userGrowthData: processUserGrowth(),
        revenueData: processRevenue()
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
                <p className="text-zinc-200">Real-time performance metrics for Locked In.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card) => {
                    const Icon = card.icon
                    return (
                        <Card key={card.name} className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-200 text-sm font-medium">{card.name}</span>
                                <Icon className={`w-5 h-5 ${card.color}`} />
                            </div>
                            <div className="text-2xl font-bold text-white">{card.value}</div>
                        </Card>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-4">
                    <h3 className="text-lg font-medium text-white">User Growth (Last 30 Days)</h3>
                    <div className="h-80">
                        <UserGrowthChart data={stats.userGrowthData} />
                    </div>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-4">
                    <h3 className="text-lg font-medium text-white">Revenue (Last 30 Days)</h3>
                    <div className="h-80">
                        <RevenueChart data={stats.revenueData} />
                    </div>
                </Card>
            </div>
        </div>
    )
}
