import prisma from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { Users as UsersIcon, UserPlus, UserCheck, UserX } from "lucide-react"

async function getUserStats() {
    const totalUsers = await prisma.user.count()
    const newUsersToday = await prisma.user.count({
        where: {
            createdAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
        }
    })
    const activeUsersToday = await prisma.session.groupBy({
        by: ['userId'],
        where: {
            startTime: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
        }
    })

    const recentUsers = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
            _count: {
                select: { sessions: true }
            }
        }
    })

    return {
        totalUsers,
        newUsersToday,
        activeUsersToday: activeUsersToday.length,
        recentUsers
    }
}

export default async function AdminUsersPage() {
    const stats = await getUserStats()

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">User Analytics</h1>
                <p className="text-zinc-200">Manage and track user growth and activity.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-200">
                        <span className="text-sm font-medium">Total Users</span>
                        <UsersIcon className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-200">
                        <span className="text-sm font-medium">New Today</span>
                        <UserPlus className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.newUsersToday}</div>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-200">
                        <span className="text-sm font-medium">Active Today</span>
                        <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.activeUsersToday}</div>
                </Card>
            </div>

            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <div className="p-6 border-b border-zinc-800">
                    <h2 className="text-xl font-semibold">Recent Signups</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-zinc-200 text-sm border-b border-zinc-800">
                                <th className="p-4 font-medium">User</th>
                                <th className="p-4 font-medium">Joined</th>
                                <th className="p-4 font-medium">Sessions</th>
                                <th className="p-4 font-medium">Balance</th>
                                <th className="p-4 font-medium">Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentUsers.map((user) => (
                                <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-white">{user.email}</div>
                                        <div className="text-xs text-zinc-300">{user.id}</div>
                                    </td>
                                    <td className="p-4 text-sm text-zinc-200">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-sm text-zinc-200">
                                        {user._count.sessions}
                                    </td>
                                    <td className="p-4 text-sm font-mono text-green-400">
                                        ${(user.balance / 100).toFixed(2)}
                                    </td>
                                    <td className="p-4 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs ${user.role === 'ADMIN' ? 'bg-blue-600/20 text-blue-400' : 'bg-zinc-800 text-zinc-400'
                                            }`}>
                                            {user.role}
                                        </span>
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
