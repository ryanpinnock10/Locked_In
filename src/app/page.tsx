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
import { AIAssistant } from "@/components/AIAssistant"
import { AISuggestion } from "@/app/api/ai/suggest/route"
import { DeepLockDisclaimer } from "@/components/DeepLockDisclaimer"
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs"

export default function Home() {
  const { isSignedIn, user } = useUser()
  const [balance, setBalance] = useState<number | null>(null)

  const [duration, setDuration] = useState([30]) // Default 30 minutes
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [showUnlockFlow, setShowUnlockFlow] = useState(false)
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)

  // Tab state: 'dashboard' | 'lock-in'
  // If signed in, default to 'dashboard'. If guest, effectively 'lock-in' (landing page)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lock-in'>('dashboard')
  const [intent, setIntent] = useState("")
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
  const [showDeepLockDisclaimer, setShowDeepLockDisclaimer] = useState(false)
  const [pendingDuration, setPendingDuration] = useState<number | undefined>(undefined)

  const [isLocked, setIsLocked] = useState(false)
  const [failureReason, setFailureReason] = useState<string | null>(null)

  useEffect(() => {
    if (isSignedIn) {
      fetch("/api/user/balance")
        .then(res => res.json())
        .then(data => setBalance(data.balance))
        .catch(err => console.error("Failed to fetch balance", err))
    }
  }, [isSignedIn, activeTab, failureReason]) // Refetch when failure happens to show deducted balance

  // Effect: When user signs in, ensure they land on dashboard
  useEffect(() => {
    if (isSignedIn) {
      setActiveTab('dashboard')
    }
  }, [isSignedIn])

  // Audio and Wake Lock functions removed

  // Focus Guard: Detect tab switching
  useEffect(() => {
    if (!isLocked) return

    console.log("Details: Focus Guard ACTIVE")
    const handleSecurityEvent = async (e?: Event) => {
      console.log("Security Check:", e?.type, "| Hidden:", document.hidden, "| HasFocus:", document.hasFocus())
      if (document.hidden || !document.hasFocus()) {
        // Tab switch OR Window/App switch detected - FAIL IMMEDIATELY
        saveSession('failed')
        setIsLocked(false)
        setTimeLeft(0)
        localStorage.removeItem("activeSessionId")
        localStorage.removeItem("targetEndTime")
        localStorage.removeItem("totalDuration")
        localStorage.removeItem("sessionIntent")
        releaseWakeLock()
        if (document.fullscreenElement) {
          document.exitFullscreen()
        }
        releaseKeyboardLock()
        setFailureReason("CHEATER DETECTED! 😡 Session failed because you switch tabs or applications.")
      }
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }

    const handleFullscreenChange = () => {
      if (isLocked && !document.fullscreenElement) {
        // User exited fullscreen (e.g. prevent default or accidental escape)
        // We cannot force it back immediately without user interaction, 
        // but we can set a state to show a "Click to Return" overlay
        // For now, we rely on the visual "Deep Lock" which might just be the lock screen itself.
        // But if they are locked, they should be in fullscreen.
      }
    }

    document.addEventListener("visibilitychange", handleSecurityEvent)
    window.addEventListener("blur", handleSecurityEvent)
    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("visibilitychange", handleSecurityEvent)
      window.removeEventListener("blur", handleSecurityEvent)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.title = "Locked In"
    }
  }, [isLocked])

  // Re-request fullscreen periodically if locked (browser might block this, but worth a try)
  useEffect(() => {
    if (isLocked && !document.fullscreenElement) {
      // Attempt to restore
      const restore = async () => {
        try { await document.documentElement.requestFullscreen() } catch (e) { }
      }
      restore()
    }
  }, [timeLeft])

  // STRICT ENFORCEMENT: Block DevTools and Escape
  useEffect(() => {
    if (!isLocked) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // Block Ctrl+Shift+I / Cmd+Option+I (DevTools)
      if ((e.ctrlKey && e.shiftKey && e.key === 'I') || (e.metaKey && e.altKey && e.key === 'i')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // Block Ctrl+Shift+J / Cmd+Option+J (DevTools Console)
      if ((e.ctrlKey && e.shiftKey && e.key === 'J') || (e.metaKey && e.altKey && e.key === 'j')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // Block Ctrl+Shift+C / Cmd+Option+C (Inspect Element)
      if ((e.ctrlKey && e.shiftKey && e.key === 'C') || (e.metaKey && e.altKey && e.key === 'c')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // Block Escape (Try to prevent it, though browser might override)
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        // Re-enforce fullscreen if possible
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => { })
        }
        return false
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
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

  const saveSession = async (status: 'completed' | 'failed') => {
    const sessionId = localStorage.getItem("activeSessionId")
    if (!sessionId) return

    try {
      await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, status })
      })
      localStorage.removeItem("activeSessionId")
    } catch (error) {
      console.error("Failed to save session", error)
    }
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
          if (document.fullscreenElement) {
            document.exitFullscreen()
          }
          releaseKeyboardLock()
          saveSession('completed')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isLocked, timeLeft])

  const handleLockIn = () => {
    if (!isSignedIn || !intent.trim()) return
    setShowAIAssistant(true)
  }

  const triggerDeepLock = (duration?: number) => {
    setPendingDuration(duration)
    setShowDeepLockDisclaimer(true)
  }

  const startSession = async (suggestedDuration?: number) => {
    const finalDuration = suggestedDuration || duration[0]
    const seconds = finalDuration * 60
    const cost = Math.round(finalDuration * 10) // $0.10 per minute -> 10 cents per minute

    // REQUEST FULLSCREEN AND LOCK KEYBOARD IMMEDIATELY (User Gesture)
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()

        // EXPERIMENTAL: Keyboard Lock (Chrome/Edge only)
        // @ts-ignore
        if (navigator.keyboard && navigator.keyboard.lock) {
          try {
            // @ts-ignore
            await navigator.keyboard.lock(['Escape', 'AltLeft', 'AltRight', 'Tab', 'MetaLeft', 'MetaRight', 'ControlLeft', 'ControlRight'])
            console.log("Keyboard locked")
          } catch (err) {
            console.warn("Keyboard lock failed", err)
          }
        }
      }
    } catch (err) {
      console.error("Fullscreen failed:", err)
    }

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: intent || "Focus Session",
          duration: finalDuration,
          cost,
          aiSuggested: !!suggestedDuration,
          aiApproach: aiSuggestion?.approach || [],
          aiBlockedApps: aiSuggestion?.blockedApps || [],
          aiTips: aiSuggestion?.tips || []
        })
      })

      if (!res.ok) {
        if (res.status === 402) {
          if (document.fullscreenElement) document.exitFullscreen()
          releaseKeyboardLock()
          alert("Insufficient funds! Please top up your wallet.")
          return
        }
        if (document.fullscreenElement) document.exitFullscreen()
        releaseKeyboardLock()
        throw new Error("Failed to start session")
      }

      const { session } = await res.json()

      // Success - Start Session
      const now = Date.now()
      const endTime = now + seconds * 1000

      localStorage.setItem("targetEndTime", endTime.toString())
      localStorage.setItem("totalDuration", seconds.toString())
      localStorage.setItem("sessionIntent", intent)
      localStorage.setItem("activeSessionId", session.id)

      setTimeLeft(seconds)
      setTotalDuration(seconds)
      if (suggestedDuration) setDuration([suggestedDuration])
      setIsLocked(true)
      setShowAIAssistant(false) // Close AI assistant after starting session
      requestWakeLock()

    } catch (error) {
      console.error("Lock In failed", error)
      if (document.fullscreenElement) document.exitFullscreen()
      releaseKeyboardLock()
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

  const handlePayToUnlock = async () => {
    // If guest, just unlock (no wallet to charge)
    if (!isSignedIn) {
      setIsLocked(false)
      setShowUnlockFlow(false)
      localStorage.removeItem("targetEndTime")
      localStorage.removeItem("totalDuration")
      localStorage.removeItem("sessionIntent")
      releaseWakeLock()
      releaseKeyboardLock()
      saveSession('failed')
      return
    }

    const penaltyAmount = 500 // $5.00
    try {
      const res = await fetch("/api/user/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: penaltyAmount,
          type: "USAGE",
          description: "Emergency Unlock Penalty"
        })
      })

      if (!res.ok) {
        if (res.status === 402) {
          alert("Insufficient funds to pay penalty! Top up or wait it out.")
          return
        }
        throw new Error("Transaction failed")
      }

      // Success - Unlock without "failed" status (or maybe 'paid_exit')
      setIsLocked(false)
      setShowUnlockFlow(false)
      localStorage.removeItem("targetEndTime")
      localStorage.removeItem("totalDuration")
      localStorage.removeItem("sessionIntent")
      releaseWakeLock()
      releaseKeyboardLock()
      saveSession('completed') // Marking as completed because they paid the price
    } catch (error) {
      console.error("Pay unlock failed", error)
      alert("Failed to process penalty payment.")
    }
  }

  const releaseKeyboardLock = () => {
    // @ts-ignore
    if (navigator.keyboard && navigator.keyboard.unlock) {
      try {
        // @ts-ignore
        navigator.keyboard.unlock()
        console.log("Keyboard unlocked")
      } catch (err) {
        console.warn("Keyboard unlock failed", err)
      }
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
    releaseKeyboardLock()
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

  if (failureReason) {
    return (
      <main className="min-h-screen bg-black text-white font-sans flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-950/20 z-0 animate-pulse" />
        <Card className="w-full max-w-md bg-zinc-900 border-red-900/50 p-8 flex flex-col items-center text-center gap-6 z-10 shadow-2xl shadow-red-900/20">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-red-500">SESSION FAILED</h1>
            <p className="text-zinc-400">{failureReason}</p>
          </div>
          <div className="p-4 bg-red-950/30 rounded-lg border border-red-900/30 w-full">
            <p className="text-sm text-red-300">Your wager based on time remaining has been forfeited.</p>
          </div>
          <Button
            onClick={() => setFailureReason(null)}
            className="w-full bg-white text-black hover:bg-zinc-200 font-bold"
          >
            I Understand
          </Button>
        </Card>
      </main>
    )
  }

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
                <UnlockFlow
                  onUnlockComplete={handleUnlockConfirm}
                  onCancel={handleUnlockCancel}
                  onPayToUnlock={handlePayToUnlock}
                  balance={balance}
                />
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
        <div className="pt-20 px-4">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
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

                      <div className="pt-4 space-y-2 border-t border-zinc-800/50">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-zinc-400">Current Balance</span>
                          <span className="font-mono text-zinc-300">
                            {balance !== null ? `$${(balance / 100).toFixed(2)}` : "..."}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-zinc-400">Session Cost</span>
                          <span className="text-xl font-bold text-green-400">
                            ${(duration[0] * 0.10).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                          <span className="text-zinc-400">Remaining After</span>
                          <span className={`font-mono font-bold ${(balance || 0) - (duration[0] * 10) < 0 ? "text-red-400" : "text-zinc-300"
                            }`}>
                            {balance !== null
                              ? `$${((balance - (duration[0] * 10)) / 100).toFixed(2)}`
                              : "..."}
                          </span>
                        </div>
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
                      disabled={!intent.trim()}
                    >
                      Lock In Now
                    </Button>
                  </div>
                </Card>

                {showAIAssistant && (
                  <AIAssistant
                    intent={intent}
                    onAccept={(suggestion) => {
                      setAiSuggestion(suggestion)
                      setShowAIAssistant(false)
                      triggerDeepLock(suggestion.estimatedDuration)
                    }}
                    onSkip={() => {
                      setShowAIAssistant(false)
                      triggerDeepLock()
                    }}
                  />
                )}

                {showDeepLockDisclaimer && (
                  <DeepLockDisclaimer
                    onConfirm={() => {
                      setShowDeepLockDisclaimer(false)
                      startSession(pendingDuration)
                    }}
                    onCancel={() => {
                      setShowDeepLockDisclaimer(false)
                      setPendingDuration(undefined)
                    }}
                  />
                )}
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
      <div className="absolute top-4 right-4 z-20 flex gap-4">
        <SignInButton mode="modal">
          <Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-zinc-800">
            Sign In
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button variant="outline" className="text-black bg-white hover:bg-zinc-200 border-none">
            Sign Up
          </Button>
        </SignUpButton>
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
