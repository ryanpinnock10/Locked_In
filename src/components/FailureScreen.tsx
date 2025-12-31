import { ShieldAlert, Share2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface FailureScreenProps {
    reason: string | null
    onAcknowledge: () => void
}

export function FailureScreen({ reason, onAcknowledge }: FailureScreenProps) {
    const handleShareShame = () => {
        const text = `I just failed my Locked In session because I ${reason?.includes("tab") ? "switched tabs" : "lacked discipline"}. 🤡\n\n@lockedin_app`
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
        window.open(url, '_blank')
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-red-950/20 z-0 animate-pulse" />

            <Card className="w-full max-w-md bg-zinc-900 border-red-900/50 p-8 flex flex-col items-center text-center gap-6 z-10 shadow-2xl shadow-red-900/20">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center animate-bounce">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-red-500 uppercase tracking-widest">Session Failed</h1>
                    <p className="text-zinc-400 text-lg">{reason || "Distraction detected."}</p>
                </div>

                <div className="p-4 bg-red-950/30 rounded-lg border border-red-900/30 w-full space-y-2">
                    <p className="text-sm text-red-300 font-medium">Consequences applied:</p>
                    <ul className="text-xs text-red-400 space-y-1">
                        <li>• Wager forfeited</li>
                        <li>• Streak reset</li>
                        <li>• Shame count increased</li>
                    </ul>
                </div>

                <div className="flex flex-col w-full gap-3">
                    <Button
                        onClick={handleShareShame}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold flex items-center gap-2"
                    >
                        <Share2 className="w-4 h-4" />
                        Share My Shame
                    </Button>

                    <Button
                        onClick={onAcknowledge}
                        variant="ghost"
                        className="w-full text-zinc-500 hover:text-white hover:bg-zinc-800"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            </Card>
        </div>
    )
}
