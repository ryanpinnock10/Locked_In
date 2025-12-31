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

                    <div className="flex gap-3 justify-center pb-2">
                        {/* Twitter / X */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                                const text = `I just failed my Locked In session. 🤡\n\n@lockedin_app`
                                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`, '_blank')
                            }}
                            className="w-12 h-12 rounded-full bg-black border border-zinc-800 text-white hover:scale-110 transition-transform"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                        </Button>

                        {/* WhatsApp (Green Brand) */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                                const text = `I just failed my Locked In session. 🤡`
                                window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + window.location.origin)}`, '_blank')
                            }}
                            className="w-12 h-12 rounded-full border-none bg-[#25D366] text-white hover:bg-[#20bd5a] hover:scale-110 transition-transform"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.248-.57-.397m-5.473 6c-3.526 0-6.818-1.375-9.294-3.873-2.476-2.497-3.85-5.816-3.85-9.351S2.63 1.303 5.105-1.196C7.581-3.694 10.873-5.07 14.399-5.07c3.526 0 6.818 1.375 9.294 3.873 2.476 2.497 3.85 5.816 3.85 9.351s-1.375 6.857-3.85 9.354c-2.476 2.497-5.768 3.873-9.294 3.873"></path>
                            </svg>
                        </Button>

                        {/* Facebook (Blue Brand) */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                                const url = window.location.origin
                                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
                            }}
                            className="w-12 h-12 rounded-full border-none bg-[#1877F2] text-white hover:bg-[#166fe5] hover:scale-110 transition-transform"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                        </Button>

                        {/* Instagram (Gradient Brand) */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={async () => {
                                const text = `I just failed my Locked In session. 🤡\n\n${window.location.origin}`
                                const shareData = { title: 'Locked In Failure', text, url: window.location.origin }

                                if (typeof navigator !== 'undefined' && navigator.share) {
                                    try {
                                        await navigator.share(shareData)
                                    } catch (err) {
                                        console.log('Share cancelled:', err)
                                    }
                                } else {
                                    await navigator.clipboard.writeText(text)
                                    alert("IG Caption copied! Open Instagram to post.")
                                }
                            }}
                            className="w-12 h-12 rounded-full border-none bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white hover:brightness-110 hover:scale-110 transition-transform"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.416 4.48c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.825-.049.905-.049 1.32-.2 1.768-.418.59-.29 1.052-.752 1.341-1.342.227-.476.39-1.064.444-2.261.031-.676.041-1.157.041-3.418v-.08c0-2.597-.01-2.917-.05-3.825-.049-.905-.2-1.32-.418-1.768-.29-.59-.752-1.052-1.342-1.341-.476-.227-1.064-.39-2.261-.444-.675-.031-1.156-.041-3.416-.041zm-1.547 4.14a4.12 4.12 0 114.12 4.12 4.12 4.12 0 01-4.12-4.12zm1.802 0a2.318 2.318 0 102.318-2.318 2.318 2.318 0 00-2.318 2.318zm4.512-5.747a1.2 1.2 0 11-1.2 1.2 1.2 1.2 0 011.2-1.2z" clipRule="evenodd" />
                            </svg>
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
