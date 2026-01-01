import { Card } from "@/components/ui/card"
import { Users, Clock, DollarSign, TrendingUp, Globe, Smartphone, BarChart3 } from "lucide-react"
import prisma from "@/lib/prisma"
import { UserGrowthChart } from "@/components/admin/UserGrowthChart"
import { RevenueChart } from "@/components/admin/RevenueChart"
import { InsightsPanel } from "@/components/admin/InsightsPanel"
import { ThreatReport } from "@/components/admin/ThreatReport"
import { VisitorChart } from "@/components/admin/VisitorChart"
import { DeviceStats } from "@/components/admin/DeviceStats"
import { CountryStats } from "@/components/admin/CountryStats"
import { SocialManager } from "@/components/admin/SocialManager"

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

    // Analytics Data
    const analyticsEvents = await prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: {
            visitorId: true,
            createdAt: true,
            country: true,
            device: true
        }
    })

    // Process Visitors & PageViews by Day
    const analyticsByDay: Record<string, { visitors: Set<string>, pageViews: number }> = {}
    for (let i = 0; i < 30; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        analyticsByDay[date] = { visitors: new Set(), pageViews: 0 }
    }

    analyticsEvents.forEach(e => {
        const date = e.createdAt.toISOString().split('T')[0]
        if (analyticsByDay[date]) {
            analyticsByDay[date].visitors.add(e.visitorId)
            analyticsByDay[date].pageViews++
        }
    })

    const visitorData = Object.entries(analyticsByDay).map(([date, data]) => ({
        date,
        visitors: data.visitors.size,
        pageViews: data.pageViews
    })).reverse()

    // Process Countries
    const countryCounts: Record<string, number> = {}
    analyticsEvents.forEach(e => {
        const c = e.country || "Unknown"
        countryCounts[c] = (countryCounts[c] || 0) + 1
    })
    const countryData = Object.entries(countryCounts)
        .map(([country, visitors]) => ({
            country,
            visitors,
            percentage: analyticsEvents.length > 0 ? Math.round((visitors / analyticsEvents.length) * 100) : 0
        }))
        .sort((a, b) => b.visitors - a.visitors)
        .slice(0, 10)

    // Process Devices
    const deviceCounts: Record<string, number> = {}
    analyticsEvents.forEach(e => {
        const d = e.device || "desktop"
        deviceCounts[d] = (deviceCounts[d] || 0) + 1
    })
    const deviceData = Object.entries(deviceCounts).map(([name, value], index) => ({
        name,
        value,
        color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"][index % 4]
    }))

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

    // Insights Data
    const sessions = await prisma.focusSession.findMany({
        where: { startTime: { gte: thirtyDaysAgo } },
        select: { duration: true, mode: true, status: true, intent: true }
    })

    const totalSessionCount = sessions.length
    const avgDuration = totalSessionCount > 0
        ? Math.round(sessions.reduce((acc, s) => acc + s.duration, 0) / totalSessionCount)
        : 0

    const modeSplit = {
        strict: sessions.filter(s => s.mode === "strict").length,
        flexible: sessions.filter(s => s.mode === "flexible").length
    }

    const completed = sessions.filter(s => s.status === "completed").length
    const completionRate = totalSessionCount > 0
        ? Math.round((completed / totalSessionCount) * 100)
        : 0

    const intentCounts: Record<string, number> = {}
    sessions.forEach(s => {
        const key = s.intent?.toLowerCase().trim() || "unknown"
        intentCounts[key] = (intentCounts[key] || 0) + 1
    })
    const topIntents = Object.entries(intentCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([intent, count]) => ({ intent, count }))

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const activeToday = await prisma.transaction.groupBy({
        by: ['userId'],
        where: {
            type: "USAGE",
            createdAt: { gte: twentyFourHoursAgo }
        }
    }).then(res => res.length)

    return {
        totalUsers,
        totalSessions,
        totalRevenue: (totalRevenue?._sum?.amount || 0) / 100,
        activeToday,
        userGrowthData: processUserGrowth(),
        revenueData: processRevenue(),
        visitorData,
        countryData,
        deviceData,
        insights: {
            avgDuration,
            modeSplit,
            completionRate,
            topIntents
        }
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
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                    <p className="text-zinc-200">Real-time performance metrics for Locked In.</p>
                </div>
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
                <ThreatReport />
                <SocialManager />
            </div>

            <InsightsPanel
                avgDuration={stats.insights.avgDuration}
                modeSplit={stats.insights.modeSplit}
                completionRate={stats.insights.completionRate}
                topIntents={stats.insights.topIntents}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-4 lg:col-span-2">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-zinc-400" />
                        <h3 className="text-lg font-medium text-white">Web Traffic (Visitors & Pageviews)</h3>
                    </div>
                    <div className="h-80">
                        <VisitorChart data={stats.visitorData} />
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-zinc-400" />
                            <h3 className="text-lg font-medium text-white">Devices</h3>
                        </div>
                        <div className="h-40">
                            <DeviceStats data={stats.deviceData} />
                        </div>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-zinc-400" />
                            <h3 className="text-lg font-medium text-white">Top Countries</h3>
                        </div>
                        <CountryStats data={stats.countryData} />
                    </Card>
                </div>
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
