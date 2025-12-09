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
import { SignInButton, UserButton, useUser } from "@clerk/nextjs"

export default function Home() {
  const { isSignedIn, user } = useUser()
  const [isLocked, setIsLocked] = useState(false)
  const [duration, setDuration] = useState([30]) // Default 30 minutes
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [showUnlockFlow, setShowUnlockFlow] = useState(false)
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)

  // Tab state: 'dashboard' | 'lock-in'
  // If signed in, default to 'dashboard'. If guest, effectively 'lock-in' (landing page)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lock-in'>('dashboard')
  const [intent, setIntent] = useState("")

  // Effect: When user signs in, ensure they land on dashboard
  useEffect(() => {
    if (isSignedIn) {
      setActiveTab('dashboard')
    }
  }, [isSignedIn])

  // ... (Audio and Wake Lock functions - same as before)
  const playAlarm = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      oscillator.type = "sawtooth" // More annoying for alarm
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
      oscillator.frequency.linearRampToValueAtTime(440, audioContext.currentTime + 0.5)
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (e) {
      console.error("Audio play failed", e)
    }
  }

  // Focus Guard: Detect tab switching
  useEffect(() => {
    if (!isLocked) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.title = "COME BACK! 😡"
        playAlarm()
        // Repeat alarm every second if hidden
        const interval = setInterval(playAlarm, 1000)
        // Store interval ID on window or ref to clear it?
        // Simpler: just play once immediately, user will likely switch back.
        // For robustness, we could set a state 'isDistracted'
      } else {
        document.title = "Locked In"
      }
    }

    const handleBlur = () => {
      // Optional: also trigger on window blur (clicking outside browser)
      // document.title = "EYES ON THE PRIZE 👀"
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("blur", handleBlur)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("blur", handleBlur)
      document.title = "Locked In"
    }
  }, [isLocked])

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
      cost: totalDuration * (0.10 / 60),
      intent: intent || "Focus Session"
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
    const storedIntent = localStorage.getItem("sessionIntent")

    if (storedEndTime && storedTotalDuration) {
      const endTime = parseInt(storedEndTime)
      const now = Date.now()

      if (endTime > now) {
        const remaining = Math.ceil((endTime - now) / 1000)
        setTimeLeft(remaining)
        setTotalDuration(parseInt(storedTotalDuration))
        if (storedIntent) setIntent(storedIntent)
        setIsLocked(true)
        requestWakeLock()
      } else {
        localStorage.removeItem("targetEndTime")
        localStorage.removeItem("totalDuration")
        localStorage.removeItem("sessionIntent")
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
          localStorage.removeItem("sessionIntent")
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

  const handleLockIn = async () => {
    if (!isSignedIn) return

    const seconds = duration[0] * 60
    const cost = Math.round(duration[0] * 10) // $0.10 per minute -> 10 cents per minute

    try {
      const res = await fetch("/api/user/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: cost,
          type: "USAGE",
          description: `Locked In: ${intent || "Focus Session"} (${duration[0]}m)`
        })
      })

      if (!res.ok) {
        if (res.status === 402) {
          alert("Insufficient funds! Please top up your wallet.")
          return
        }
        throw new Error("Transaction failed")
      }

      // Success - Start Session
      const now = Date.now()
      const endTime = now + seconds * 1000

      localStorage.setItem("targetEndTime", endTime.toString())
      localStorage.setItem("totalDuration", seconds.toString())
      localStorage.setItem("sessionIntent", intent)

      setTimeLeft(seconds)
      setTotalDuration(seconds)
      setIsLocked(true)
      requestWakeLock()

    } catch (error) {
      console.error("Lock In failed", error)
      alert("Failed to start session. Please try again.")
    }
  }

  const handleExtend = async () => {
    const additionalMinutes = 15
    const cost = 150 // $1.50 for 15 mins

    try {
      const res = await fetch("/api/user/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: cost,
          type: "USAGE",
          description: `Extended Session (+15m)`
        })
      })

      if (!res.ok) {
        if (res.status === 402) {
          alert("Insufficient funds to extend! Please top up.")
          return
        }
        throw new Error("Transaction failed")
      }

      // Success - Extend Session
      const additionalSeconds = additionalMinutes * 60
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

    } catch (error) {
      console.error("Extend failed", error)
      alert("Failed to extend session.")
    }
  }

  const handleUnlockRequest = () => setShowUnlockFlow(true)

  const handleUnlockConfirm = () => {
    setIsLocked(false)
    setShowUnlockFlow(false)
    localStorage.removeItem("targetEndTime")
    localStorage.removeItem("totalDuration")
    localStorage.removeItem("sessionIntent")
    releaseWakeLock()
    saveSession('failed')
  }

  const handleUnlockCancel = () => setShowUnlockFlow(false)

  // RENDER HELPERS
  const renderTabNavigation = () => (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex p-1 bg-zinc-900/80 backdrop-blur-md rounded-full border border-zinc-800">
      <button
        onClick={() => setActiveTab('dashboard')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
      >
        Dashboard
      </button>
      <button
        onClick={() => setActiveTab('lock-in')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'lock-in' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
      >
        Lock In
      </button>
    </div>
  )

  // If locked, show lock screen regardless of auth state (persistence)
  if (isLocked) {
    return (
      <main className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
        <AnimatePresence mode="wait">
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
              intent={intent}
            />
            <AnimatePresence>
              {showUnlockFlow && (
                <UnlockFlow onUnlockComplete={handleUnlockConfirm} onCancel={handleUnlockCancel} />
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </main>
    )
  }

  // Authenticated User View
  if (isSignedIn) {
    return (
      <main className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 relative">
        {/* Header: User Profile */}
        <div className="absolute top-4 right-4 z-30">
          <UserButton afterSignOutUrl="/" />
        </div>

        {/* Tab Navigation */}
        {renderTabNavigation()}

        {/* Content Area */}
        <div className="pt-20 px-4 h-screen overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full"
              >
                <Dashboard onLockIn={() => setActiveTab('lock-in')} />
              </motion.div>
            ) : (
              <motion.div
                key="lock-in"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center justify-center h-full pb-20"
              >
                {/* Lock In Card (Reused) */}
                <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800 backdrop-blur-xl p-8 flex flex-col gap-8 shadow-2xl">
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800/50 mb-4 ring-1 ring-zinc-700">
                      <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tighter text-white">Ready to Focus?</h1>
                    <p className="text-zinc-400">Select your duration and lock in.</p>
                  </div>

                  <div className="space-y-6">
                    {/* Intent Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300">I am locking in to...</label>
                      <input
                        type="text"
                        placeholder="e.g. Finish the report"
                        value={intent}
                        onChange={(e) => setIntent(e.target.value)}
                        className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      />
                    </div>

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
                      disabled={!intent.trim()} // Require intent? Maybe optional but encouraged. Let's leave enabled but maybe highlight if empty.
                    >
                      Lock In Now
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    )
  }

  // Guest View (Landing Page)
  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Auth Button Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <SignInButton mode="modal">
          <Button variant="outline" className="text-black bg-white hover:bg-zinc-200 border-none">
            Sign In
          </Button>
        </SignInButton>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse" />
      </div>

      {/* Landing Content */}
      <Card className="z-10 w-full max-w-md bg-zinc-900/50 border-zinc-800 backdrop-blur-xl p-8 flex flex-col gap-8 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800/50 mb-4 ring-1 ring-zinc-700">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Locked In</h1>
          <p className="text-zinc-400">Focus on what matters. No distractions.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-4 opacity-50 pointer-events-none filter blur-[1px]">
            {/* Blurred Preview of Controls */}
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duration
              </label>
              <span className="text-2xl font-bold tabular-nums text-blue-400">30 min</span>
            </div>
            <Slider defaultValue={[30]} max={180} className="py-4" />
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <p className="text-center text-zinc-300 text-sm">
              Sign in to track your progress and start locking in.
            </p>
          </div>

          <SignInButton mode="modal">
            <Button
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg h-14 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started
            </Button>
          </SignInButton>
        </div>
      </Card>
    </main>
  )
}
