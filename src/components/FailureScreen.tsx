import { ShieldAlert, Share2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface FailureScreenProps {
    reason: string | null
    onAcknowledge: () => void
}

export function FailureScreen({ reason, onAcknowledge }: FailureScreenProps) {


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
                        onClick={async () => {
                            const text = `I just failed my Locked In session because I ${reason?.includes("tab") ? "switched tabs" : "lacked discipline"}. 🤡\n\nPublicly shaming myself at:`
                            const url = window.location.origin
                            const shareData = { title: 'Locked In Failure', text, url }

                            if (typeof navigator !== 'undefined' && navigator.share) {
                                try {
                                    await navigator.share(shareData)
                                } catch (err) {
                                    console.log('Error sharing:', err)
                                }
                            } else {
                                await navigator.clipboard.writeText(`${text} ${url}`)
                                alert("Shame copied to clipboard.")
                            }
                        }}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold flex items-center justify-center gap-2"
                    >
                        <Share2 className="w-4 h-4" />
                        Share My Shame
                    </Button>

                    <div className="flex gap-2 justify-center pb-2">
                        {/* Desktop Fallbacks */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                                const text = `I just failed my Locked In session. 🤡\n\n@lockedin_app`
                                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`, '_blank')
                            }}
                            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:text-blue-400"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                                const text = `I just failed my Locked In session. 🤡`
                                window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + window.location.origin)}`, '_blank')
                            }}
                            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:text-green-400"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.248-.57-.397m-5.473 6c-3.526 0-6.818-1.375-9.294-3.873-2.476-2.497-3.85-5.816-3.85-9.351S2.63 1.303 5.105-1.196C7.581-3.694 10.873-5.07 14.399-5.07c3.526 0 6.818 1.375 9.294 3.873 2.476 2.497 3.85 5.816 3.85 9.351s-1.375 6.857-3.85 9.354c-2.476 2.497-5.768 3.873-9.294 3.873"></path><path d="M12.003 21.5c-2.505 0-4.87-.785-6.863-2.126l.483.284-5.009 1.314 1.339-4.881-.308-.49C.207 13.844-.22 11.531-.22 9.176c0-5.69 4.629-10.318 10.318-10.318 5.69 0 10.318 4.628 10.318 10.318 0 5.688-4.628 10.316-10.318 10.316"></path></svg>
                        </Button>
                    </div>

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
