import prisma from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { Clock, CheckCircle, XCircle, Sparkles, Zap } from "lucide-react"

async function getSessionStats() {
    const totalSessions = await prisma.session.count()
    const completedSessions = await prisma.session.count({ where: { status: 'completed' } })
    const failedSessions = await prisma.session.count({ where: { status: 'failed' } })
    const aiSessions = await prisma.session.count({ where: { aiSuggested: true } })

    const recentSessions = await prisma.session.findMany({
        orderBy: { startTime: 'desc' },
        take: 15,
        include: {
            user: {
                select: { email: true }
            }
        }
    })

    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0
    const aiAdoptionRate = totalSessions > 0 ? (aiSessions / totalSessions) * 100 : 0

    return {
        totalSessions,
        completedSessions,
        failedSessions,
        aiSessions,
        completionRate,
        aiAdoptionRate,
        recentSessions
    }
}

export default async function AdminSessionsPage() {
    const stats = await getSessionStats()

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Session Analytics</h1>
                <p className="text-zinc-400">Track focus session performance and AI assistant impact.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-sm font-medium">Total Sessions</span>
                        <Clock className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.totalSessions}</div>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-sm font-medium">Completion Rate</span>
                        <Zap className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.completionRate.toFixed(1)}%</div>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-sm font-medium">AI Assisted</span>
                        <Sparkles className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.aiSessions}</div>
                    <div className="text-xs text-zinc-500">{stats.aiAdoptionRate.toFixed(1)}% adoption</div>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-sm font-medium">Failed Sessions</span>
                        <XCircle className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.failedSessions}</div>
                </Card>
            </div>

            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <div className="p-6 border-b border-zinc-800">
                    <h2 className="text-xl font-semibold">Recent Sessions</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-zinc-500 text-sm border-b border-zinc-800">
                                <th className="p-4 font-medium">User</th>
                                <th className="p-4 font-medium">Intent</th>
                                <th className="p-4 font-medium">Duration</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">AI?</th>
                                <th className="p-4 font-medium">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentSessions.map((session) => (
                                <tr key={session.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                    <td className="p-4">
                                        <div className="text-sm font-medium">{session.user.email}</div>
                                    </td>
                                    <td className="p-4 text-sm text-zinc-300">
                                        {session.intent}
                                    </td>
                                    <td className="p-4 text-sm">
                                        {session.duration}m
                                    </td>
                                    <td className="p-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            {session.status === 'completed' ? (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                            ) : session.status === 'failed' ? (
                                                <XCircle className="w-4 h-4 text-red-500" />
                                            ) : (
                                                <Clock className="w-4 h-4 text-blue-500" />
                                            )}
                                            <span className="capitalize">{session.status}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm">
                                        {session.aiSuggested ? (
                                            <Sparkles className="w-4 h-4 text-blue-400" />
                                        ) : (
                                            <span className="text-zinc-600">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-zinc-400">
                                        {new Date(session.startTime).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
