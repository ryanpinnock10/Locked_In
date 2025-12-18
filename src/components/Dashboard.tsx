"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Clock, DollarSign, Trophy, XCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { Wallet } from "@/components/Wallet"

export interface Session {
    id: string
    startTime: string | number
    duration: number // in minutes
    status: 'completed' | 'failed' | 'active'
    cost: number // in cents
    intent: string
    aiSuggested?: boolean
}

interface DashboardProps {
    onBack?: () => void // Optional now as we might not use it in tab mode
    onLockIn: () => void
}

type TimePeriod = '1d' | '7d' | '30d' | '90d' | 'all'

export function Dashboard({ onBack, onLockIn }: DashboardProps) {
    const [sessions, setSessions] = useState<Session[]>([])
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const res = await fetch("/api/sessions/history")
                if (res.ok) {
                    const data = await res.json()
                    setSessions(data)
                }
            } catch (error) {
                console.error("Failed to fetch sessions", error)
            } finally {
                setLoading(false)
            }
        }
        fetchSessions()
    }, [])

    // Filter sessions based on time period
    const getFilteredSessions = () => {
        const now = new Date()
        return sessions.filter(session => {
            const sessionDate = new Date(session.startTime)
            if (timePeriod === 'all') return true

            const diffDays = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)

            if (timePeriod === '1d') return diffDays <= 1
            if (timePeriod === '7d') return diffDays <= 7
            if (timePeriod === '30d') return diffDays <= 30
            if (timePeriod === '90d') return diffDays <= 90
            return true
        })
    }

    const filteredSessions = getFilteredSessions()

    const totalTime = filteredSessions.reduce((acc, s) => s.status === 'completed' ? acc + s.duration : acc, 0)
    const totalCost = filteredSessions.reduce((acc, s) => acc + (s.cost / 100), 0)
    const completedSessions = filteredSessions.filter(s => s.status === 'completed').length

    const formatDuration = (mins: number) => {
        if (mins < 60) return `${mins}m`
        const h = Math.floor(mins / 60)
        const m = mins % 60
        return m > 0 ? `${h}h ${m}m` : `${h}h`
    }

    const formatDate = (dateInput: string | number) => {
        const date = new Date(dateInput)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const timePeriodButtons: { value: TimePeriod; label: string }[] = [
        { value: '1d', label: '1D' },
        { value: '7d', label: '7D' },
        { value: '30d', label: '30D' },
        { value: '90d', label: '90D' },
        { value: 'all', label: 'All' },
    ]

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-screen bg-black text-white p-4 md:p-8"
        >
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <Button variant="ghost" size="icon" onClick={onBack} className="text-zinc-400 hover:text-white">
                                <ArrowLeft className="w-6 h-6" />
                            </Button>
                        )}
                        <h1 className="text-3xl font-bold tracking-tight">Your Progress</h1>
                    </div>
                    <Button onClick={onLockIn} className="bg-blue-600 hover:bg-blue-500 text-white">
                        Start Session
                    </Button>
                </div>

                <Wallet />

                {/* Time Period Filter */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-zinc-300">Analytics</h2>
                    <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                        {timePeriodButtons.map((period) => (
                            <button
                                key={period.value}
                                onClick={() => setTimePeriod(period.value)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${timePeriod === period.value
                                    ? "bg-zinc-800 text-white shadow-sm"
                                    : "text-zinc-400 hover:text-white"
                                    }`}
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-zinc-900/50 border-zinc-800 p-6 flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
                            <Clock className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="text-3xl font-bold font-mono text-white">{formatDuration(totalTime)}</div>
                        <div className="text-xs text-zinc-400 uppercase tracking-widest">Total Focus</div>
                    </Card>

                    <Card className="bg-zinc-900/50 border-zinc-800 p-6 flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                            <Trophy className="w-6 h-6 text-green-500" />
                        </div>
                        <div className="text-3xl font-bold font-mono text-white">{completedSessions}</div>
                        <div className="text-xs text-zinc-400 uppercase tracking-widest">Sessions Completed</div>
                    </Card>

                    <Card className="bg-zinc-900/50 border-zinc-800 p-6 flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-2">
                            <DollarSign className="w-6 h-6 text-purple-500" />
                        </div>
                        <div className="text-3xl font-bold font-mono text-white">${totalCost.toFixed(2)}</div>
                        <div className="text-xs text-zinc-400 uppercase tracking-widest">Value Committed</div>
                    </Card>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-zinc-300">Recent Sessions</h2>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="text-center text-zinc-500 py-8 border border-zinc-800 rounded-md bg-zinc-900/20">
                            {timePeriod === 'all'
                                ? 'No sessions yet. Lock in to start!'
                                : `No sessions in the last ${timePeriod.toUpperCase()}`
                            }
                        </div>
                    ) : (
                        <div className="h-[500px] overflow-y-scroll rounded-md border border-zinc-800 bg-zinc-900/20 p-4 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                            {filteredSessions.map((session, index) => (
                                <div
                                    key={`session-${index}`}
                                    className="flex-shrink-0 flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        {session.status === 'completed' ? (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-500" />
                                        )}
                                        <div>
                                            <div className="font-medium text-zinc-200">
                                                {session.intent || "Focus Session"}
                                            </div>
                                            <div className="text-xs text-zinc-500">
                                                {formatDuration(session.duration)} • {formatDate(session.startTime)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-mono font-bold ${session.status === 'completed' ? 'text-green-400' : 'text-red-400'}`}>
                                            {session.status === 'completed' ? '+$' : '-$'}{(session.cost / 100).toFixed(2)}
                                        </div>
                                        <div className="text-xs text-zinc-500 uppercase">
                                            {session.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    )
}
