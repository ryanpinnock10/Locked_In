import { Share2, CheckCircle2, Home, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"
import confetti from "canvas-confetti"
import { useEffect } from "react"

interface SuccessScreenProps {
    duration: number // in minutes
    onReturn: () => void
}

export function SuccessScreen({ duration, onReturn }: SuccessScreenProps) {
    useEffect(() => {
        const end = Date.now() + 3 * 1000;
        const colors = ['#3b82f6', '#ffffff'];

        (function frame() {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }, []);

    const handleShareVictory = () => {
        const text = `Just completed a ${duration}m Deep Work session on Locked In. ⚡️\n\nNo distractions. Pure focus.\n\n@lockedin_app`
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
        window.open(url, '_blank')
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-900/20 z-0 animate-pulse" />

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <Card className="w-full max-w-md bg-zinc-900 border-blue-900/50 p-8 flex flex-col items-center text-center gap-8 z-10 shadow-2xl shadow-blue-900/20 relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

                    <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-ping" />
                        <Trophy className="w-12 h-12 text-blue-400" />
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-bold text-white tracking-tight">Mission Accomplished</h1>
                        <p className="text-zinc-400 text-lg">
                            You stayed locked in for <span className="text-blue-400 font-bold">{duration} minutes</span>.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 w-full">
                        <div className="bg-zinc-800/50 p-3 rounded-lg flex flex-col gap-1">
                            <span className="text-xs text-zinc-500">Focus</span>
                            <span className="font-mono text-green-400">100%</span>
                        </div>
                        <div className="bg-zinc-800/50 p-3 rounded-lg flex flex-col gap-1">
                            <span className="text-xs text-zinc-500">Earnings</span>
                            <span className="font-mono text-yellow-400">+100</span>
                        </div>
                        <div className="bg-zinc-800/50 p-3 rounded-lg flex flex-col gap-1">
                            <span className="text-xs text-zinc-500">Streak</span>
                            <span className="font-mono text-blue-400">🔥 1</span>
                        </div>
                    </div>

                    <div className="flex flex-col w-full gap-3 mt-4">
                        <Button
                            onClick={handleShareVictory}
                            className="w-full bg-white text-black hover:bg-zinc-200 font-bold flex items-center gap-2 h-12 text-lg"
                        >
                            <Share2 className="w-5 h-5" />
                            Share Victory
                        </Button>

                        <Button
                            onClick={onReturn}
                            variant="ghost"
                            className="w-full text-zinc-500 hover:text-white"
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Return to Dashboard
                        </Button>
                    </div>
                </Card>
            </motion.div>
        </div>
    )
}
