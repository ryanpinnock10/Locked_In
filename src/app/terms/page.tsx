import Link from "next/link"
import { ShieldAlert } from "lucide-react"

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-black text-white font-sans p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="text-zinc-400 hover:text-white transition-colors">← Back</Link>
                    <h1 className="text-3xl font-bold">Terms of Service</h1>
                </div>

                <div className="space-y-6 text-zinc-300 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">1. The &quot;Lock In&quot; Agreement</h2>
                        <p>
                            By starting a session on Locked In, you explicitly agree to our unique financial penalty mechanism.
                            You understand that <strong>money will be deducted</strong> from your wallet or balance if you fail to complete your session duration.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">2. Strict & Flexible Modes</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Strict Mode ($0.10/min):</strong> Fails immediately if you navigate away, minimize the window, or switch tabs. Any forfeited funds are non-refundable.</li>
                            <li><strong>Flexible Mode ($0.30/min):</strong> Allows tab switching. You are paying a premium for the flexibility to research while maintaining a financial stake in your work.</li>
                        </ul>
                    </section>

                    <section className="bg-red-950/20 border border-red-900/30 p-4 rounded-lg">
                        <div className="flex gap-2 items-center mb-2">
                            <ShieldAlert className="w-5 h-5 text-red-500" />
                            <h2 className="text-lg font-bold text-red-400">3. No Refunds</h2>
                        </div>
                        <p className="text-red-200/80">
                            Due to the nature of the application as a commitment device, we <strong>do not offer refunds</strong> for failed sessions.
                            The penalty is the product. Failure is the price you pay for distraction.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">4. User Responsibility</h2>
                        <p>
                            You are responsible for ensuring your device environment (battery, internet connection) is stable before locking in.
                            Locked In is not responsible for technical failures on the client side that result in a session failure.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">5. Privacy & Data</h2>
                        <p>
                            Please review our <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link> to understand how we handle your data.
                        </p>
                    </section>
                </div>

                <div className="pt-12 border-t border-zinc-800 text-sm text-zinc-500">
                    Last Updated: December 2025
                </div>
            </div>
        </main>
    )
}
