import prisma from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { DollarSign, CreditCard, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react"

async function getRevenueStats() {
    const totalRevenue = await prisma.transaction.aggregate({
        where: { type: "PURCHASE" },
        _sum: { amount: true }
    })
    const totalUsage = await prisma.transaction.aggregate({
        where: { type: "USAGE" },
        _sum: { amount: true }
    })
    const totalBalance = await prisma.user.aggregate({
        _sum: { balance: true }
    })

    const recentTransactions = await prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
            user: {
                select: { email: true }
            }
        }
    })

    return {
        totalRevenue: (totalRevenue._sum.amount || 0) / 100,
        totalUsage: Math.abs(totalUsage._sum.amount || 0) / 100,
        totalBalance: (totalBalance._sum.balance || 0) / 100,
        recentTransactions
    }
}

export default async function AdminRevenuePage() {
    const stats = await getRevenueStats()

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Revenue Analytics</h1>
                <p className="text-zinc-400">Monitor financial performance and transaction history.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-sm font-medium">Total Revenue (Deposits)</span>
                        <DollarSign className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-sm font-medium">Total Usage (Revenue Recognized)</span>
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold">${stats.totalUsage.toFixed(2)}</div>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-sm font-medium">Liability (User Balances)</span>
                        <CreditCard className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="text-2xl font-bold">${stats.totalBalance.toFixed(2)}</div>
                </Card>
            </div>

            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <div className="p-6 border-b border-zinc-800">
                    <h2 className="text-xl font-semibold">Recent Transactions</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-zinc-500 text-sm border-b border-zinc-800">
                                <th className="p-4 font-medium">User</th>
                                <th className="p-4 font-medium">Type</th>
                                <th className="p-4 font-medium">Amount</th>
                                <th className="p-4 font-medium">Description</th>
                                <th className="p-4 font-medium">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentTransactions.map((tx) => (
                                <tr key={tx.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                    <td className="p-4">
                                        <div className="text-sm font-medium">{tx.user.email}</div>
                                    </td>
                                    <td className="p-4 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs ${tx.type === 'PURCHASE' ? 'bg-green-600/20 text-green-400' :
                                                tx.type === 'USAGE' ? 'bg-blue-600/20 text-blue-400' : 'bg-zinc-800 text-zinc-400'
                                            }`}>
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td className={`p-4 text-sm font-mono font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {tx.amount > 0 ? '+' : ''}${(tx.amount / 100).toFixed(2)}
                                    </td>
                                    <td className="p-4 text-sm text-zinc-400">
                                        {tx.description}
                                    </td>
                                    <td className="p-4 text-sm text-zinc-400">
                                        {new Date(tx.createdAt).toLocaleString()}
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
