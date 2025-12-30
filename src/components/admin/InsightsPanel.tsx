"use client"

import { Card } from "@/components/ui/card"
import { Timer, Shield, Activity, Target } from "lucide-react"

interface InsightsProps {
    avgDuration: number
    modeSplit: {
        strict: number
        flexible: number
    }
    completionRate: number
    topIntents: { intent: string, count: number }[]
}

export function InsightsPanel({ avgDuration, modeSplit, completionRate, topIntents }: InsightsProps) {
    const totalSessions = modeSplit.strict + modeSplit.flexible
    const strictPct = totalSessions > 0 ? Math.round((modeSplit.strict / totalSessions) * 100) : 0
    const flexiblePct = totalSessions > 0 ? Math.round((modeSplit.flexible / totalSessions) * 100) : 0

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">Behavior Insights</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Avg Duration */}
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-400 text-sm font-medium">Avg. Duration</span>
                        <Timer className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <span className="text-3xl font-bold text-white">{avgDuration}</span>
                        <span className="text-zinc-500 text-sm ml-2">min</span>
                    </div>
                </Card>

                {/* Mode Split */}
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-400 text-sm font-medium">Mode Preference</span>
                        <Shield className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-300">Strict</span>
                            <span className="text-white font-bold">{strictPct}%</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden flex">
                            <div className="bg-purple-500 h-full" style={{ width: `${strictPct}%` }} />
                            <div className="bg-blue-500 h-full" style={{ width: `${flexiblePct}%` }} />
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-300">Flexible</span>
                            <span className="text-white font-bold">{flexiblePct}%</span>
                        </div>
                    </div>
                </Card>

                {/* Completion Rate */}
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-400 text-sm font-medium">Completion Rate</span>
                        <Activity className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {completionRate}%
                    </div>
                    <p className="text-xs text-zinc-500">Sessions ended successfully</p>
                </Card>

                {/* Top Intent */}
                <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-400 text-sm font-medium">Top Intent</span>
                        <Target className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="text-lg font-medium text-white truncate">
                        {topIntents[0]?.intent || "N/A"}
                    </div>
                    <p className="text-xs text-zinc-500">Most common user goal</p>
                </Card>
            </div>
        </div>
    )
}
