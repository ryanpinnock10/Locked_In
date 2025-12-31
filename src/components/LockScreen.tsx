"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AnimatedLock } from "@/components/AnimatedLock"
import { useTranslation } from "react-i18next"

interface LockScreenProps {
    timeLeft: number
    totalDuration: number
    onUnlock: () => void
    onExtend: () => void
    intent?: string
}

export function LockScreen({ timeLeft, totalDuration, onUnlock, onExtend, intent }: LockScreenProps) {
    const { t } = useTranslation()
    const [isHoveringUnlock, setIsHoveringUnlock] = useState(false)
    const [showControls, setShowControls] = useState(false)
    const [clickCount, setClickCount] = useState(0)

    const handleLockClick = () => {
        setClickCount(prev => {
            console.log("Lock clicked. Count:", prev + 1)
            const newCount = prev + 1
            if (newCount >= 3) {
                setShowControls(true)
                return 0
            }
            return newCount
        })

        // Reset click count after 1 second if not completed
        setTimeout(() => setClickCount(0), 1000)
    }

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    }

    const handleBackgroundClick = (e: React.MouseEvent) => {
        // If clicking directly on the background container (not children)
        if (e.target === e.currentTarget && showControls) {
            setShowControls(false)
        }
    }

    const progress = ((totalDuration - timeLeft) / totalDuration) * 100

    return (
        <div
            className="flex flex-col items-center justify-center min-h-screen bg-black text-white relative overflow-hidden selection:bg-none"
            onClick={handleBackgroundClick}
        >
            {/* Background Pulse */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] animate-pulse" />
            </div>

            <div className="z-10 flex flex-col items-center gap-12 w-full max-w-md px-8 pointer-events-none">
                {/* Intent Display */}
                {intent && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-2 pointer-events-auto"
                    >
                        <span className="text-sm text-zinc-600 uppercase tracking-widest">{t('lockScreen.intentLabel')}</span>
                        <h2 className="text-2xl font-bold text-white tracking-tight">{intent}</h2>
                    </motion.div>
                )}

                {/* Timer Circle */}
                <div className="flex flex-col items-center gap-8 w-full">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={{
                            hidden: { scale: 0.8, opacity: 0 },
                            visible: { scale: 1, opacity: 1 },
                            exit: { scale: 0.8, opacity: 0, transition: { delay: 0.2 } }
                        }}
                        transition={{ duration: 0.5 }}
                        className="relative cursor-pointer active:scale-95 transition-transform pointer-events-auto"
                        onClick={handleLockClick}
                    >
                        <div className={`absolute inset-0 bg-blue-500/20 blur-xl rounded-full transition-opacity duration-500 ${showControls ? "opacity-100" : "opacity-0"}`} />
                        <AnimatedLock />
                    </motion.div>

                    <div className="text-center space-y-2 select-none pointer-events-auto">
                        <div className="text-7xl font-bold font-mono tracking-tighter text-white tabular-nums">
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    <div className="w-full max-w-xs space-y-2 pointer-events-auto">
                        <Progress value={progress} className="h-1 bg-zinc-900" />
                    </div>

                    <AnimatePresence>
                        {showControls && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: 20, height: 0 }}
                                className="flex flex-col gap-3 w-full pointer-events-auto"
                            >
                                <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl p-6 flex flex-col gap-4">
                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                                        onClick={onExtend}
                                    >
                                        {t('lockScreen.extend')} - $1.50
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
                                            {t('lockScreen.emergencyUnlock')}
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
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {!showControls && (
                <div className="absolute bottom-8 text-zinc-800 text-xs uppercase tracking-widest select-none">
                    {t('lockScreen.controlTip')}
                </div>
            )}
        </div>
    )
}

