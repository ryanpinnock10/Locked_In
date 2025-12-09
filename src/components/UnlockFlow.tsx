"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, X, Check, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UnlockFlowProps {
    onUnlockComplete: () => void
    onCancel: () => void
}

export function UnlockFlow({ onUnlockComplete, onCancel }: UnlockFlowProps) {
    const [step, setStep] = useState(1)
    const [confirmationText, setConfirmationText] = useState("")
    const [isShake, setIsShake] = useState(false)

    const handleStep1 = () => setStep(2)
    const handleStep2 = () => setStep(3)

    const handleStep3 = () => {
        if (confirmationText.toLowerCase() === "i give up") {
            onUnlockComplete()
        } else {
            setIsShake(true)
            setTimeout(() => setIsShake(false), 500)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 p-6 relative overflow-hidden">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-zinc-500 hover:text-white"
                    onClick={onCancel}
                >
                    <X className="w-4 h-4" />
                </Button>

                <div className="mb-6 flex justify-center">
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`w-3 h-3 rounded-full transition-colors duration-300 ${step >= s ? "bg-red-500" : "bg-zinc-800"
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4 text-center"
                        >
                            <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Are you sure?</h2>
                            <p className="text-zinc-400 text-sm">
                                You committed to this time. Unlocking now means breaking your promise to yourself.
                            </p>
                            <div className="flex gap-3 pt-4">
                                <Button variant="outline" className="flex-1 border-zinc-700 hover:bg-zinc-800" onClick={onCancel}>
                                    Stay Locked In
                                </Button>
                                <Button variant="destructive" className="flex-1" onClick={handleStep1}>
                                    I want to quit
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4 text-center"
                        >
                            <div className="mx-auto w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-8 h-8 text-orange-500" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Really sure?</h2>
                            <p className="text-zinc-400 text-sm">
                                Distractions are waiting. Your goals are waiting too. Which one do you choose?
                            </p>
                            <div className="flex gap-3 pt-4">
                                <Button variant="outline" className="flex-1 border-zinc-700 hover:bg-zinc-800" onClick={onCancel}>
                                    Keep Focusing
                                </Button>
                                <Button variant="destructive" className="flex-1" onClick={handleStep2}>
                                    Unlock Anyway
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4 text-center"
                        >
                            <div className="mx-auto w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                                <X className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Final Confirmation</h2>
                            <p className="text-zinc-400 text-sm">
                                Type <span className="text-red-400 font-mono font-bold">I give up</span> below to unlock.
                            </p>

                            <motion.div animate={isShake ? { x: [-10, 10, -10, 10, 0] } : {}}>
                                <Input
                                    value={confirmationText}
                                    onChange={(e) => setConfirmationText(e.target.value)}
                                    placeholder="I give up"
                                    className="bg-zinc-950 border-zinc-800 text-center font-mono placeholder:text-zinc-700 text-white"
                                />
                            </motion.div>

                            <div className="flex gap-3 pt-4">
                                <Button variant="outline" className="flex-1 border-zinc-700 hover:bg-zinc-800" onClick={onCancel}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={handleStep3}
                                    disabled={confirmationText.toLowerCase() !== "i give up"}
                                >
                                    Unlock
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </div>
    )
}
