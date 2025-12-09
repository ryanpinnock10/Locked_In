"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AnimatedLock } from "@/components/AnimatedLock"

interface LockScreenProps {
    timeLeft: number
    totalDuration: number
    onUnlock: () => void
    onExtend: () => void
}

export function LockScreen({ timeLeft, totalDuration, onUnlock, onExtend }: LockScreenProps) {
    const [isHoveringUnlock, setIsHoveringUnlock] = useState(false)

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    }

    const progress = (timeLeft / totalDuration) * 100

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 relative overflow-hidden">
            {/* Ambient Background Animation */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <Card className="z-10 w-full max-w-md bg-zinc-900/50 border-zinc-800 backdrop-blur-xl p-8 flex flex-col items-center gap-8 shadow-2xl shadow-blue-900/20">
                <motion.div
                    variants={{
                        hidden: { scale: 0.8, opacity: 0 },
                        visible: { scale: 1, opacity: 1 },
                        exit: { scale: 0.8, opacity: 0, transition: { delay: 0.2 } }
                    }}
                    transition={{ duration: 0.5 }}
                    className="relative"
                >
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                    <AnimatedLock />
                </motion.div>

                <div className="text-center space-y-2">
                    <h2 className="text-zinc-400 text-sm uppercase tracking-widest">Time Remaining</h2>
                    <div className="text-6xl font-bold font-mono tracking-tighter text-white tabular-nums">
                        {formatTime(timeLeft)}
                    </div>
                </div>

                <div className="w-full space-y-2">
                    <Progress value={progress} className="h-2 bg-zinc-800" />
                    <div className="flex justify-between text-xs text-zinc-500">
                        <span>Locked In</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                </div>

                <div className="flex flex-col gap-3 w-full">
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                        onClick={onExtend}
                    >
                        Extend (+15m) - $1.50
                    </Button>

                    <Button
                        variant="outline"
                        className="group relative overflow-hidden border-zinc-800 text-zinc-400 hover:bg-red-950/30 hover:text-red-400 hover:border-red-900/50 transition-all duration-300"
                        onMouseEnter={() => setIsHoveringUnlock(true)}
                        onMouseLeave={() => setIsHoveringUnlock(false)}
                        onClick={onUnlock}
                    >
                        <span className="relative z-10 flex items-center gap-2 justify-center w-full">
                            <Unlock className="w-4 h-4" />
                            Emergency Unlock
                        </span>
                        {isHoveringUnlock && (
                            <motion.div
                                layoutId="unlock-hover"
                                className="absolute inset-0 bg-red-500/10"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            />
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    )
}
