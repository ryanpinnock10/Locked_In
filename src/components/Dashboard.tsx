"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Clock, DollarSign, Trophy, XCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface Session {
    id: string
    startTime: number
    duration: number // in seconds
    status: 'completed' | 'failed'
    cost: number
}

interface DashboardProps {
    onBack: () => void
}

export function Dashboard({ onBack }: DashboardProps) {
    const [sessions, setSessions] = useState<Session[]>([])

    useEffect(() => {
        const stored = localStorage.getItem("lockedIn_sessions")
        if (stored) {
            setSessions(JSON.parse(stored).reverse()) // Newest first
        }
    }, [])

    const totalTime = sessions.reduce((acc, s) => s.status === 'completed' ? acc + s.duration : acc, 0)
    const totalCost = sessions.reduce((acc, s) => acc + s.cost, 0)
    const completedSessions = sessions.filter(s => s.status === 'completed').length

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        if (h > 0) return `${h}h ${m}m`
        return `${m}m`
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-screen bg-black text-white p-4 md:p-8"
        >
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="text-zinc-400 hover:text-white">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Your Progress</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-zinc-900/50 border-zinc-800 p-6 flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
                            <Clock className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="text-3xl font-bold font-mono">{formatDuration(totalTime)}</div>
                        <div className="text-xs text-zinc-500 uppercase tracking-widest">Total Focus</div>
                    </Card>

                    <Card className="bg-zinc-900/50 border-zinc-800 p-6 flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                            <Trophy className="w-6 h-6 text-green-500" />
                        </div>
                        <div className="text-3xl font-bold font-mono">{completedSessions}</div>
                        <div className="text-xs text-zinc-500 uppercase tracking-widest">Sessions Completed</div>
                    </Card>

                    <Card className="bg-zinc-900/50 border-zinc-800 p-6 flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-2">
                            <DollarSign className="w-6 h-6 text-purple-500" />
                        </div>
                        <div className="text-3xl font-bold font-mono">${totalCost.toFixed(2)}</div>
                        <div className="text-xs text-zinc-500 uppercase tracking-widest">Value Committed</div>
                    </Card>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-zinc-300">Recent Sessions</h2>
                    <ScrollArea className="h-[400px] rounded-md border border-zinc-800 bg-zinc-900/20 p-4">
                        <div className="space-y-3">
                            {sessions.length === 0 ? (
                                <div className="text-center text-zinc-500 py-8">No sessions yet. Lock in to start!</div>
                            ) : (
                                sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            {session.status === 'completed' ? (
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-red-500" />
                                            )}
                                            <div>
                                                <div className="font-medium text-zinc-200">
                                                    {formatDuration(session.duration)} Focus
                                                </div>
                                                <div className="text-xs text-zinc-500">
                                                    {formatDate(session.startTime)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-mono font-bold ${session.status === 'completed' ? 'text-green-400' : 'text-red-400'}`}>
                                                {session.status === 'completed' ? '+$' : '-$'}{session.cost.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-zinc-500 uppercase">
                                                {session.status}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </motion.div>
    )
}
