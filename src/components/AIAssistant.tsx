"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sparkles, CheckCircle2, XCircle, Clock, Shield, Lightbulb } from "lucide-react"
import { AISuggestion } from "@/app/api/ai/suggest/route"

interface AIAssistantProps {
    intent: string
    onAccept: (suggestion: AISuggestion) => void
    onSkip: () => void
}

export function AIAssistant({ intent, onAccept, onSkip }: AIAssistantProps) {
    const [open, setOpen] = useState(true)
    const [loading, setLoading] = useState(false)
    const [suggestion, setSuggestion] = useState<AISuggestion | null>(null)
    const [error, setError] = useState<string | null>(null)

    const fetchSuggestion = async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch("/api/ai/suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ intent }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to get AI suggestions")
            }

            setSuggestion(data)
        } catch (err: any) {
            setError(err.message || "Could not generate suggestions. Please try again.")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleAccept = () => {
        if (suggestion) {
            onAccept(suggestion)
            setOpen(false)
        }
    }

    const handleSkip = () => {
        onSkip()
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
            <DialogContent className="sm:max-w-2xl bg-zinc-900 border-zinc-800">
                <DialogHeader>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-400" />
                            <DialogTitle className="text-xl font-bold text-white">Focus Guide</DialogTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
                                Standard (Preview)
                            </span>
                            <button className="text-[10px] text-zinc-500 hover:text-white transition-colors uppercase tracking-wider underline underline-offset-2">
                                Go Pro
                            </button>
                        </div>
                    </div>
                    <DialogDescription className="text-zinc-400">
                        Get a glimpse of our <span className="text-blue-400 font-semibold italic">Upcoming Premium AI</span> for tackling: <span className="text-zinc-200 font-medium">{intent}</span>
                    </DialogDescription>
                </DialogHeader>

                {!suggestion && !loading && !error && (
                    <div className="flex flex-col items-center py-8 gap-4">
                        <Sparkles className="w-16 h-16 text-blue-400 animate-pulse" />
                        <p className="text-zinc-400 text-center text-sm">
                            Unlock real-time task decomposition and strategy with our upcoming <span className="text-blue-400">Pro Tier</span>.
                            Preview the Standard experience below.
                        </p>
                        <div className="flex gap-3 mt-4">
                            <Button onClick={fetchSuggestion} className="bg-blue-600 hover:bg-blue-700">
                                <Sparkles className="w-4 h-4 mr-2" />
                                Get AI Suggestions
                            </Button>
                            <Button variant="ghost" onClick={handleSkip} className="text-zinc-400">
                                Skip
                            </Button>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center py-12 gap-4">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-zinc-400">AI is analyzing your task...</p>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center py-8 gap-4">
                        <XCircle className="w-12 h-12 text-red-400" />
                        <p className="text-red-400">{error}</p>
                        <Button onClick={fetchSuggestion} variant="outline">
                            Try Again
                        </Button>
                    </div>
                )}

                {suggestion && (
                    <div className="space-y-6 max-h-[500px] overflow-y-auto">
                        {/* Approach */}
                        <div>
                            <h3 className="flex items-center gap-2 font-semibold text-zinc-200 mb-3">
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                Suggested Approach
                            </h3>
                            <ol className="space-y-2 ml-7">
                                {suggestion.approach.map((step, i) => (
                                    <li key={i} className="text-zinc-300 text-sm">
                                        <span className="font-semibold text-blue-400">{i + 1}.</span> {step}
                                    </li>
                                ))}
                            </ol>
                        </div>

                        {/* Blocked Apps */}
                        {suggestion.blockedApps.length > 0 && (
                            <div>
                                <h3 className="flex items-center gap-2 font-semibold text-zinc-200 mb-3">
                                    <Shield className="w-5 h-5 text-purple-400" />
                                    Recommended Apps to Block
                                </h3>
                                <div className="flex flex-wrap gap-2 ml-7">
                                    {suggestion.blockedApps.map((app, i) => (
                                        <span
                                            key={i}
                                            className="px-3 py-1 bg-purple-600/20 border border-purple-600/50 rounded-full text-sm text-purple-200"
                                        >
                                            {app}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Duration */}
                        <div>
                            <h3 className="flex items-center gap-2 font-semibold text-zinc-200 mb-3">
                                <Clock className="w-5 h-5 text-orange-400" />
                                Suggested Duration
                            </h3>
                            <p className="text-zinc-300 ml-7">{suggestion.estimatedDuration} minutes</p>
                        </div>

                        {/* Tips */}
                        <div>
                            <h3 className="flex items-center gap-2 font-semibold text-zinc-200 mb-3">
                                <Lightbulb className="w-5 h-5 text-yellow-400" />
                                Focus Tips
                            </h3>
                            <ul className="space-y-2 ml-7">
                                {suggestion.tips.map((tip, i) => (
                                    <li key={i} className="text-zinc-300 text-sm flex items-start gap-2">
                                        <span className="text-yellow-400">•</span>
                                        <span>{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {suggestion && (
                    <DialogFooter className="flex gap-2">
                        <Button variant="ghost" onClick={handleSkip} className="text-zinc-400">
                            Ignore
                        </Button>
                        <Button onClick={handleAccept} className="bg-blue-600 hover:bg-blue-700">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Use These Suggestions
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
