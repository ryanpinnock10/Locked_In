"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lock, Clock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { LockScreen } from "@/components/LockScreen"
import { UnlockFlow } from "@/components/UnlockFlow"

export default function Home() {
  const [isLocked, setIsLocked] = useState(false)
  const [duration, setDuration] = useState([30]) // Default 30 minutes



  const [showUnlockFlow, setShowUnlockFlow] = useState(false)

  const handleLockIn = () => {
    setIsLocked(true)
  }

  const handleUnlockRequest = () => {
    setShowUnlockFlow(true)
  }

  const handleUnlockConfirm = () => {
    setIsLocked(false)
    setShowUnlockFlow(false)
  }

  const handleUnlockCancel = () => {
    setShowUnlockFlow(false)
  }

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <AnimatePresence mode="wait">
        {isLocked ? (
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full h-full relative"
          >
            <LockScreen initialTime={duration[0] * 60} onUnlock={handleUnlockRequest} />
            <AnimatePresence>
              {showUnlockFlow && (
                <UnlockFlow onUnlockComplete={handleUnlockConfirm} onCancel={handleUnlockCancel} />
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="selection"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden"
          >
            {/* Background Elements */}
            <div className="absolute inset-0 z-0">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black" />
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse" />
            </div>

            <Card className="z-10 w-full max-w-md bg-zinc-900/50 border-zinc-800 backdrop-blur-xl p-8 flex flex-col gap-8 shadow-2xl">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800/50 mb-4 ring-1 ring-zinc-700">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold tracking-tighter text-white">Locked In</h1>
                <p className="text-zinc-400">Focus on what matters. No distractions.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Duration
                    </label>
                    <span className="text-2xl font-bold tabular-nums text-blue-400">
                      {duration[0]} <span className="text-sm font-normal text-zinc-500">min</span>
                    </span>
                  </div>
                  <Slider
                    value={duration}
                    onValueChange={setDuration}
                    max={180}
                    step={5}
                    min={5}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>5m</span>
                    <span>3h</span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm text-zinc-400">Session Cost</span>
                    <span className="text-xl font-bold text-green-400">
                      ${(duration[0] * 0.10).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-3 text-sm text-zinc-400 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                    <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                    <span>Triple confirmation required to unlock early.</span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full bg-white text-black hover:bg-zinc-200 font-bold text-lg h-14 shadow-lg shadow-white/5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  onClick={handleLockIn}
                >
                  Lock In Now
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
