"use client"

import { useState, type ChangeEvent } from "react"
import { MessageSquarePlus, X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { AnimatePresence, motion } from "framer-motion"

export function FeedbackWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [feedback, setFeedback] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [sent, setSent] = useState(false)

    const handleSubmit = async () => {
        if (!feedback.trim()) return

        setIsSending(true)
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: feedback })
            })

            if (res.ok) {
                setSent(true)
                setFeedback("")
                setTimeout(() => {
                    setSent(false)
                    setIsOpen(false)
                }, 2000)
            }
        } catch (error) {
            console.error("Failed to send feedback", error)
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="mb-4"
                    >
                        <Card className="w-80 bg-zinc-900 border-zinc-800 p-4 shadow-xl">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-white">Give Feedback</h3>
                                <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {sent ? (
                                <div className="text-center py-6 text-green-400 text-sm font-medium">
                                    Thank you! We&apos;re listening.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Textarea
                                        placeholder="Ideas? Bugs? Rants? Tell us."
                                        className="bg-black/50 border-zinc-700 text-white text-sm h-24 resize-none focus:ring-blue-500/50"
                                        value={feedback}
                                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}
                                    />
                                    <Button
                                        size="sm"
                                        className="w-full bg-white text-black hover:bg-zinc-200"
                                        onClick={handleSubmit}
                                        disabled={isSending || !feedback.trim()}
                                    >
                                        {isSending ? "Sending..." : (
                                            <>
                                                Send <Send className="w-3 h-3 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-3 rounded-full shadow-lg transition-all ${isOpen ? 'bg-zinc-800 text-zinc-400' : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'}`}
            >
                {isOpen ? <X className="w-5 h-5" /> : <MessageSquarePlus className="w-5 h-5" />}
            </button>
        </div>
    )
}
