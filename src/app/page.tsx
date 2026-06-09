"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lock, Clock, ShieldCheck, LayoutDashboard, Info, Sparkles } from "lucide-react"
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
import { LandingPage } from "@/components/LandingPage"
import { Input } from "@/components/ui/input"
import { FeedbackWidget } from "@/components/FeedbackWidget"
import Link from "next/link"
import { FailureScreen } from "@/components/FailureScreen"
import { SuccessScreen } from "@/components/SuccessScreen"
import { useCallback } from "react"
import { saveGuestSession, getGuestHistory, clearGuestHistory } from "@/lib/guest-history"
import { useTranslation, Trans } from "react-i18next"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import "@/lib/i18n"

export default function Home() {
  const { t } = useTranslation()
  const { isSignedIn, user } = useUser()
  const [balance, setBalance] = useState<number | null>(null)

  const [duration, setDuration] = useState([30]) // Default 30 minutes
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [showUnlockFlow, setShowUnlockFlow] = useState(false)
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)

  // Tab state: 'dashboard' | 'lock-in'
  // If signed in, default to 'dashboard'. If guest, effectively 'lock-in' (landing page)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lock-in'>('lock-in')
  const [intent, setIntent] = useState("")
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
  const [showDeepLockDisclaimer, setShowDeepLockDisclaimer] = useState(false)
  const [pendingDuration, setPendingDuration] = useState<number | undefined>(undefined)

  const [isLocked, setIsLocked] = useState(false)
  const [failureReason, setFailureReason] = useState<string | null>(null)

  // New state for guest onboarding
  const [hasEnteredApp, setHasEnteredApp] = useState(false)

  // Flexible Mode State: 'strict' ($0.10/min, blocks tabs) vs 'flexible' ($0.30/min, allows tabs)
  const [lockMode, setLockMode] = useState<'strict' | 'flexible'>('strict')
  const [showModeInfo, setShowModeInfo] = useState(false)

  // Success State
  const [showSuccessScreen, setShowSuccessScreen] = useState(false)
  const [lastSessionDuration, setLastSessionDuration] = useState(0)

  // Custom Pricing State
  const [pricePerMinute, setPricePerMinute] = useState(20) // Default 20 cents/min

  // HYDRATION FIX: Detect mount
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
    setTimeout(() => setShowInputHint(false), 8000)
  }, [])

  const [showInputHint, setShowInputHint] = useState(true)

  // HELPER FUNCTIONS (Hoisted & Memoized)
  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        const sentinel = await navigator.wakeLock.request("screen")
        setWakeLock(sentinel)
      }
    } catch (err) {
      console.error("Wake Lock failed:", err)
    }
  }, [])

  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release()
        setWakeLock(null)
      } catch (err) {
        console.error("Wake Lock release failed:", err)
      }
    }
  }, [wakeLock])

  const releaseKeyboardLock = useCallback(() => {
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
  }, [])

  const saveSession = useCallback(async (status: 'completed' | 'failed') => {
    // Handling for Guests (Local Storage)
    if (!isSignedIn) {
      const intent = localStorage.getItem("sessionIntent") || "Guest Session"
      const totalDuration = parseInt(localStorage.getItem("totalDuration") || "0")
      const cost = totalDuration * pricePerMinute * (lockMode === 'flexible' ? 3 : 1) / 60 // Calculate approx cost

      saveGuestSession({
        intent,
        duration: Math.floor(totalDuration / 60), // Store in minutes
        cost: Math.floor(cost),
        status,
        mode: lockMode,
        completedAt: new Date().toISOString()
      })
      return
    }

    const sessionId = localStorage.getItem("activeSessionId")
    if (!sessionId) return

    try {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Send `success` so the server can verify the timer and refund the stake
        // on a genuine completion (server is the source of truth, see API route).
        body: JSON.stringify({ sessionId, status, success: status === "completed" })
      })
      // Refresh wallet balance so a refunded stake is reflected immediately.
      if (res.ok && isSignedIn) {
        fetch("/api/user/balance")
          .then(r => r.json())
          .then(data => setBalance(data.balance))
          .catch(() => { })
      }
      localStorage.removeItem("activeSessionId")
    } catch (error) {
      console.error("Failed to save session", error)
    }
  }, [isSignedIn, pricePerMinute, lockMode])

  // Effect: Sync Guest History on Sign In
  useEffect(() => {
    if (isSignedIn) {
      const history = getGuestHistory()
      if (history.length > 0) {
        fetch("/api/user/sync-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessions: history })
        })
          .then(res => {
            if (res.ok) {
              clearGuestHistory()
              // Optionally trigger a balance/data refetch here
              window.location.reload() // Simple way to refresh dashboard data for now
            }
          })
          .catch(err => console.error("Failed to sync guest history", err))
      }
    }
  }, [isSignedIn])

  useEffect(() => {
    if (isSignedIn) {
      fetch("/api/user/balance")
        .then(res => res.json())
        .then(data => setBalance(data.balance))
        .catch(err => console.error("Failed to fetch balance", err))
    }
  }, [isSignedIn, activeTab, failureReason, showSuccessScreen]) // Refetch on success/failure

  // Effect: When user signs in, ensure they land on dashboard
  useEffect(() => {
    if (isSignedIn) {
      setActiveTab('dashboard')
    }

    // Restore lock mode preference
    const storedMode = localStorage.getItem("lockMode")
    if (storedMode === 'flexible') setLockMode('flexible')
  }, [isSignedIn])



  // Audio and Wake Lock functions removed

  // Focus Guard: Detect tab switching
  useEffect(() => {
    if (!isLocked) return

    // SKIP IF FLEXIBLE MODE
    if (lockMode === 'flexible') {
      console.log("Details: Flexible Mode Active - Focus Guard Disabled")
      return
    }

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
  }, [isLocked, lockMode, saveSession, releaseWakeLock, releaseKeyboardLock])

  // Re-request fullscreen periodically if locked (browser might block this, but worth a try)
  useEffect(() => {
    if (isLocked && !document.fullscreenElement) {
      // Attempt to restore
      const restore = async () => {
        try { await document.documentElement.requestFullscreen() } catch (e) { }
      }
      restore()
    }
  }, [timeLeft, isLocked])

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
  }, [requestWakeLock])

  // Timer Logic
  useEffect(() => {
    if (!isLocked || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsLocked(false)

          // Capture duration for success screen
          const durationMins = totalDuration ? Math.round(totalDuration / 60) : duration[0]
          setLastSessionDuration(durationMins)
          setShowSuccessScreen(true)

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
  }, [isLocked, timeLeft, duration, totalDuration, releaseWakeLock, releaseKeyboardLock, saveSession])

  const handleLockIn = () => {
    if (!intent.trim()) return

    if (!isSignedIn) {
      handleGuestCheckout()
      return
    }

    triggerDeepLock()
  }

  const triggerDeepLock = (duration?: number) => {
    setPendingDuration(duration)
    setShowDeepLockDisclaimer(true)
  }

  const initiateGuestPayment = async (amountCents: number, redirectParams: string) => {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountCents,
          isGuest: true,
          redirectParams
        })
      })

      if (!res.ok) throw new Error("Checkout failed")
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (e) {
      console.error("Guest payment error", e)
      alert(`Failed to initiate payment: ${e instanceof Error ? e.message : "Unknown error"}`)
    }
  }

  const handleGuestCheckout = async () => {
    const finalDuration = duration[0]
    const multiplier = lockMode === 'flexible' ? 3 : 1
    const cost = Math.round(finalDuration * pricePerMinute * multiplier)

    // Save pending state
    localStorage.setItem("pendingGuestSession", JSON.stringify({
      duration: finalDuration,
      intent: intent
    }))

    // Save mode preference for restoration
    localStorage.setItem("lockMode", lockMode)

    await initiateGuestPayment(cost, "")
  }

  const startGuestSession = useCallback(async (durationMinutes: number, sessionIntent: string) => {
    const seconds = durationMinutes * 60

    // Request Fullscreen/WakeLock locally
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
        // @ts-ignore
        if (navigator.keyboard && navigator.keyboard.lock) {
          // @ts-ignore
          navigator.keyboard.lock(['Escape', 'AltLeft', 'AltRight', 'Tab', 'MetaLeft', 'MetaRight', 'ControlLeft', 'ControlRight']).catch(console.warn)
        }
      }
    } catch (e) { console.warn("Fullscreen failed", e) }

    const now = Date.now()
    const endTime = now + seconds * 1000

    localStorage.setItem("targetEndTime", endTime.toString())
    localStorage.setItem("totalDuration", seconds.toString())
    localStorage.setItem("sessionIntent", sessionIntent)
    // No activeSessionId for guests (client-side only)

    setTimeLeft(seconds)
    setTotalDuration(seconds)
    setDuration([durationMinutes])
    setIntent(sessionIntent)
    setIsLocked(true)
    requestWakeLock()
  }, [requestWakeLock])

  // Payment Success Handling (Moved here to be after startGuestSession definition)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      const isGuestParams = params.get('guest') === 'true'
      window.history.replaceState({}, '', window.location.pathname)

      if (isGuestParams) {
        const action = params.get('action')

        if (action === 'extend') {
          // EXTEND SESSION LOGIC
          const additionalSeconds = 15 * 60
          const currentEndTime = parseInt(localStorage.getItem("targetEndTime") || "0")
          const currentTotal = parseInt(localStorage.getItem("totalDuration") || "0")

          if (currentEndTime > 0) {
            const newEndTime = currentEndTime + additionalSeconds * 1000
            const newTotal = currentTotal + additionalSeconds

            localStorage.setItem("targetEndTime", newEndTime.toString())
            localStorage.setItem("totalDuration", newTotal.toString())

            setTotalDuration(newTotal)
            const now = Date.now()
            setTimeLeft(Math.max(0, Math.floor((newEndTime - now) / 1000)))

            alert("Session Extended! +15 Minutes Added.")
          } else {
            alert("Could not extend: No active session found.")
          }
        } else if (action === 'unlock') {
          // UNLOCK / PAID EXIT LOGIC
          setIsLocked(false)
          setShowUnlockFlow(false)
          localStorage.removeItem("targetEndTime")
          localStorage.removeItem("totalDuration")
          localStorage.removeItem("sessionIntent")
          if (document.fullscreenElement) document.exitFullscreen()
          alert("Emergency Unlock Successful. You paid the price.")
        } else {
          // DEFAULT: START NEW SESSION
          const pending = localStorage.getItem("pendingGuestSession")
          if (pending) {
            const { duration, intent } = JSON.parse(pending)
            startGuestSession(duration, intent)
            localStorage.removeItem("pendingGuestSession")
            alert("Guest Session Started! Good luck.")
          } else {
            if (!localStorage.getItem("activeSessionId")) {
              alert("Payment successful, but session details were lost.")
            }
          }
        }
      } else {
        if (isSignedIn) {
          fetch("/api/user/balance")
            .then(res => res.json())
            .then(data => setBalance(data.balance))
        }
        alert("Credits added to wallet.")
      }
      setActiveTab('dashboard')
    }
    if (params.get('canceled') === 'true') {
      alert("Payment canceled.")
    }
  }, [isSignedIn, startGuestSession])

  const startSession = async (suggestedDuration?: number) => {
    const finalDuration = suggestedDuration || duration[0]
    const seconds = finalDuration * 60
    const multiplier = lockMode === 'flexible' ? 3 : 1
    const cost = Math.round(finalDuration * pricePerMinute * multiplier)

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
          aiTips: aiSuggestion?.tips || [],
          mode: lockMode
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

    // Guest Handling
    // Guest Handling
    if (!isSignedIn) {
      alert("Extensions are for members only! Create an account to unlock this feature.")
      return
    }

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
    // If guest, redirect to payment to unlock ($5.00)
    // If guest, redirect to payment to unlock ($5.00)
    if (!isSignedIn) {
      alert("Guest sessions are binding by design! Create an account to enable Emergency Unlock.")
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
    setFailureReason("You chose to give up. The easy way request is denied... just kidding, you're out.")
  }

  const handleUnlockCancel = () => setShowUnlockFlow(false)

  // RENDER HELPERS
  const renderTabNavigation = () => (
    <div className="flex justify-center w-full z-20 mt-4 md:absolute md:top-4 md:left-1/2 md:-translate-x-1/2 md:mt-0">
      <div className="flex p-1 bg-zinc-900/80 backdrop-blur-md rounded-full border border-zinc-800">
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
    </div>
  )

  if (!isMounted) return null

  if (failureReason) {
    return (
      <FailureScreen
        reason={failureReason}
        onAcknowledge={() => setFailureReason(null)}
      />
    )
  }

  if (showSuccessScreen) {
    return (
      <SuccessScreen
        duration={lastSessionDuration}
        onReturn={() => {
          setShowSuccessScreen(false)
          setActiveTab('dashboard')
        }}
      />
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

  // Authenticated User View OR Guest who entered app
  if (isSignedIn || hasEnteredApp) {
    return (
      <main className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 relative">
        {/* Header: User Profile & Admin & Auth */}
        <div className="absolute top-4 right-4 z-30 flex gap-4 items-center">
          <LanguageSwitcher />
          {isSignedIn && user?.primaryEmailAddress?.emailAddress === "ryanpinnock10@gmail.com" && (
            <Link href="/admin">
              <Button variant="outline" className="text-zinc-300 border-zinc-700 bg-black/50 hover:bg-zinc-800 flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Admin
              </Button>
            </Link>
          )}

          {isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <div className="flex gap-2">
              <SignInButton mode="modal">
                <Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-zinc-800 text-sm">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="outline" className="text-black bg-white hover:bg-zinc-200 border-none text-sm">
                  Sign Up
                </Button>
              </SignUpButton>
            </div>
          )}
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
                {!isSignedIn ? (
                  <div className="flex flex-col items-center justify-center pt-20">
                    <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800 backdrop-blur-xl p-8 text-center space-y-6 shadow-2xl">
                      <div className="mx-auto w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center">
                        <ShieldCheck className="w-8 h-8 text-zinc-500" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{t('dashboard.guestDashboard')}</h2>
                        <p className="text-zinc-400">
                          {t('dashboard.guestDesc')}
                        </p>
                      </div>
                      <div className="flex gap-4 justify-center">
                        <SignUpButton mode="modal">
                          <Button size="lg" className="bg-white text-black hover:bg-zinc-200">
                            {t('dashboard.createAccount')}
                          </Button>
                        </SignUpButton>
                        <Button
                          variant="ghost"
                          size="lg"
                          onClick={() => setActiveTab('lock-in')}
                          className="text-zinc-500 hover:text-white hover:bg-zinc-800"
                        >
                          {t('dashboard.goBack')}
                        </Button>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <Dashboard onLockIn={() => setActiveTab('lock-in')} />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="lock-in"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center justify-center h-full pb-20"
              >
                {/* Lock In Card */}
                <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800 backdrop-blur-xl p-8 flex flex-col gap-8 shadow-2xl">
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800/50 mb-4 ring-1 ring-zinc-700">
                      <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tighter text-white">{t('dashboard.welcome')}</h1>
                    <p className="text-zinc-400">{t('dashboard.subtitle')}</p>
                  </div>

                  <div className="space-y-6">
                    {/* Intent Input */}
                    <AnimatePresence>
                      {showInputHint && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center justify-center gap-2 text-xs text-blue-400 bg-blue-500/10 p-2 rounded-lg border border-blue-500/20 mb-4"
                        >
                          <Info className="w-3 h-3" />
                          <span>Tip: Tap the numbers to enter a custom value</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-zinc-300">{t('dashboard.lockingInTo')}</label>
                        {isSignedIn && (
                          <button
                            onClick={() => setShowAIAssistant(true)}
                            className="text-xs flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded-full border border-blue-500/20"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span className="font-medium">AI Guide</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder={t('dashboard.placeholder')}
                        value={intent}
                        onChange={(e) => setIntent(e.target.value)}
                        className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center gap-4">
                        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {t('dashboard.duration')}
                        </label>
                        <div className="relative group">
                          <Input
                            type="number"
                            value={duration[0] === 0 ? '' : duration[0]}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value)
                              setDuration([Math.max(0, val)])
                            }}
                            onBlur={(e) => {
                              let val = parseInt(e.target.value) || 5
                              if (val < 5) val = 5
                              setDuration([val])
                            }}
                            className="w-24 bg-transparent border-transparent hover:bg-zinc-800/50 focus:bg-zinc-900 border hover:border-zinc-700 focus:border-blue-500/50 transition-all text-right font-mono text-xl text-white p-0 h-auto focus:ring-0"
                          />
                          <div className="absolute top-0 right-0 -mr-2 -mt-2 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <Slider
                        value={duration}
                        onValueChange={setDuration}
                        max={180}
                        step={5}
                        min={5}
                        className="py-4"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center gap-4">
                        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                          <span className="text-green-500">$</span>
                          {t('dashboard.wager')}
                          <button
                            onClick={() => alert("This is the base amount you wager per minute. In specific modes like 'Flexible', a multiplier may apply.")}
                            className="text-zinc-600 hover:text-zinc-400 transition-colors ml-1"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        </label>
                        <Input
                          type="number"
                          value={pricePerMinute === 0 ? '' : pricePerMinute}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value)
                            setPricePerMinute(Math.max(0, val))
                          }}
                          onBlur={(e) => {
                            let val = parseInt(e.target.value) || 20
                            if (val < 20) val = 20
                            setPricePerMinute(val)
                          }}
                          className="w-24 bg-transparent border-transparent hover:bg-zinc-800/50 focus:bg-zinc-900 border hover:border-zinc-700 focus:border-blue-500/50 transition-all text-right font-mono text-xl text-green-400 font-bold p-0 h-auto focus:ring-0"
                        />
                      </div>

                      <Slider
                        value={[Math.min(pricePerMinute, 100)]}
                        onValueChange={(val) => setPricePerMinute(val[0])}
                        max={100}
                        step={5}
                        min={20}
                        className="py-4"
                      />
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>20¢</span>
                        <span>$1.00+</span>
                      </div>
                      <p className="text-xs text-center text-zinc-500">
                        {t('dashboard.cost')}: <span className="text-white font-bold">${((duration[0] * pricePerMinute * (lockMode === 'flexible' ? 3 : 1)) / 100).toFixed(2)}</span>
                        {lockMode === 'flexible' && <span className="ml-1 text-blue-400 text-[10px] uppercase font-bold tracking-wider">({t('modes.multiplier')})</span>}
                        <br />
                        <span className="opacity-50">{t('dashboard.ifFail')}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 space-y-4 border-t border-zinc-800/50">

                    {/* MODE TOGGLE */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{t('dashboard.lockMode')}</span>
                        <button
                          onClick={() => setShowModeInfo(!showModeInfo)}
                          className="text-zinc-500 hover:text-white transition-colors"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>

                      {showModeInfo && (
                        <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-700 text-xs text-zinc-300 space-y-2 mb-2">
                          <p><strong className="text-white">{t('modes.strict')}:</strong> {t('modes.strictDesc')}</p>
                          <p><strong className="text-blue-400">{t('modes.flexible')}:</strong> {t('modes.flexibleDesc')} <span className="text-blue-300 font-bold">{t('modes.multiplier')}</span></p>
                        </div>
                      )}

                      <div className="flex gap-2 p-1 bg-zinc-900 rounded-lg border border-zinc-700">
                        <Button
                          variant="ghost"
                          className={`flex-1 h-8 text-xs ${lockMode === 'strict' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                          onClick={() => { setLockMode('strict'); localStorage.setItem("lockMode", 'strict') }}
                        >
                          {t('modes.strict')} (1x)
                        </Button>
                        <Button
                          variant="ghost"
                          className={`flex-1 h-8 text-xs ${lockMode === 'flexible' ? 'bg-zinc-800 text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                          onClick={() => { setLockMode('flexible'); localStorage.setItem("lockMode", 'flexible') }}
                        >
                          {t('modes.flexible')} (3x)
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400">{t('dashboard.balance')}</span>
                      <span className="font-mono text-zinc-300">
                        {balance !== null ? `$${(balance / 100).toFixed(2)}` : "..."}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">{t('dashboard.cost')}</span>
                      <span className="text-xl font-bold text-green-400">
                        ${(duration[0] * pricePerMinute * (lockMode === 'flexible' ? 3 : 1) / 100).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400">{t('dashboard.remainingAfter')}</span>
                      <span className={`font-mono font-bold ${(balance || 0) - (duration[0] * pricePerMinute) < 0 ? "text-red-400" : "text-zinc-300"
                        }`}>
                        {balance !== null
                          ? `$${((balance - (duration[0] * pricePerMinute)) / 100).toFixed(2)}`
                          : "..."}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-zinc-800">
                    <div className="flex items-center gap-3 text-sm text-zinc-400 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                      <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                      <span>{t('dashboard.securityConf')}</span>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-white text-black hover:bg-zinc-200 font-bold text-lg h-14 shadow-lg shadow-white/5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    onClick={handleLockIn}
                    disabled={!intent.trim()}
                  >
                    {t('dashboard.lockInNow')}
                  </Button>
                </Card >

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
                )
                }

                {
                  showDeepLockDisclaimer && (
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
                  )
                }
              </motion.div >
            )
            }
          </AnimatePresence >
        </div >
        <FeedbackWidget />
      </main >
    )
  }

  // Guest View (Landing Page)
  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse" />
      </div>

      <LandingPage onEnterApp={() => setHasEnteredApp(true)} />

    </main>
  )
}
