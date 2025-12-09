"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lock, Clock, ShieldCheck, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { LockScreen } from "@/components/LockScreen"
import { UnlockFlow } from "@/components/UnlockFlow"
import { Dashboard, Session } from "@/components/Dashboard"

export default function Home() {
  const [isLocked, setIsLocked] = useState(false)
  const [duration, setDuration] = useState([30]) // Default 30 minutes
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [showUnlockFlow, setShowUnlockFlow] = useState(false)
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)
  const [showDashboard, setShowDashboard] = useState(false)

  // Play a simple beep sound
  const playAlarm = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime) // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.5) // Drop to A4

      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (e) {
      console.error("Audio play failed", e)
    }
  }

  // Request Wake Lock
  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        const sentinel = await navigator.wakeLock.request("screen")
        setWakeLock(sentinel)
      }
    } catch (err) {
      console.error("Wake Lock failed:", err)
    }
  }

  // Release Wake Lock
  const releaseWakeLock = async () => {
    if (wakeLock) {
      try {
        await wakeLock.release()
        setWakeLock(null)
      } catch (err) {
        console.error("Wake Lock release failed:", err)
      }
    }
  }

  const saveSession = (status: 'completed' | 'failed') => {
    const session: Session = {
      id: Date.now().toString(),
      startTime: Date.now(),
      duration: totalDuration,
      status,
      cost: totalDuration * (0.10 / 60) // $0.10 per minute
    }

    const existing = localStorage.getItem("lockedIn_sessions")
    const sessions = existing ? JSON.parse(existing) : []
    sessions.push(session)
    localStorage.setItem("lockedIn_sessions", JSON.stringify(sessions))
  }

  // Restore session on mount
  useEffect(() => {
    const storedEndTime = localStorage.getItem("targetEndTime")
    const storedTotalDuration = localStorage.getItem("totalDuration")

    if (storedEndTime && storedTotalDuration) {
      const endTime = parseInt(storedEndTime)
      const now = Date.now()

      if (endTime > now) {
        const remaining = Math.ceil((endTime - now) / 1000)
        setTimeLeft(remaining)
        setTotalDuration(parseInt(storedTotalDuration))
        setIsLocked(true)
        requestWakeLock()
      } else {
        // Session ended while closed
        localStorage.removeItem("targetEndTime")
        localStorage.removeItem("totalDuration")
      }
    }
  }, [])

  // Timer Logic
  useEffect(() => {
    if (!isLocked || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsLocked(false)
          localStorage.removeItem("targetEndTime")
          localStorage.removeItem("totalDuration")
          releaseWakeLock()
          playAlarm()
          saveSession('completed')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isLocked, timeLeft])

  const handleLockIn = () => {
    const seconds = duration[0] * 60
    const now = Date.now()
    const endTime = now + seconds * 1000

    localStorage.setItem("targetEndTime", endTime.toString())
    localStorage.setItem("totalDuration", seconds.toString())

    setTimeLeft(seconds)
    setTotalDuration(seconds)
    setIsLocked(true)
    requestWakeLock()
  }

  const handleExtend = () => {
    const additionalSeconds = 15 * 60 // 15 minutes
    const now = Date.now()

    const currentEndTime = parseInt(localStorage.getItem("targetEndTime") || "0")
    let newEndTime

    if (currentEndTime > now) {
      newEndTime = currentEndTime + additionalSeconds * 1000
    } else {
      newEndTime = now + (timeLeft + additionalSeconds) * 1000
    }

    localStorage.setItem("targetEndTime", newEndTime.toString())
    const newTotal = totalDuration + additionalSeconds
    localStorage.setItem("totalDuration", newTotal.toString())
    setTotalDuration(newTotal)

    setTimeLeft((prev) => prev + additionalSeconds)
  }

  const handleUnlockRequest = () => {
    setShowUnlockFlow(true)
  }

  const handleUnlockConfirm = () => {
    setIsLocked(false)
    setShowUnlockFlow(false)
    localStorage.removeItem("targetEndTime")
    localStorage.removeItem("totalDuration")
    releaseWakeLock()
    saveSession('failed')
  }

  const handleUnlockCancel = () => {
    setShowUnlockFlow(false)
  }

  if (showDashboard) {
    return <Dashboard onBack={() => setShowDashboard(false)} />
  }

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <AnimatePresence mode="wait">
        {isLocked ? (
          <motion.div
            key="locked"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -20, transition: { delay: 0.4 } }
            }}
            className="w-full h-full relative"
          >
            <LockScreen
              timeLeft={timeLeft}
              totalDuration={totalDuration}
              onUnlock={handleUnlockRequest}
              onExtend={handleExtend}
            />
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
            {/* Dashboard Toggle */}
            <div className="absolute top-4 right-4 z-20">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDashboard(true)}
                className="text-zinc-500 hover:text-white"
              >
                <LayoutDashboard className="w-6 h-6" />
              </Button>
            </div>
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
