import Link from "next/link"

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-black text-white font-sans p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="text-zinc-400 hover:text-white transition-colors">← Back</Link>
                    <h1 className="text-3xl font-bold">Privacy Policy</h1>
                </div>

                <div className="space-y-6 text-zinc-300 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">1. Data Collection</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Account Data:</strong> We use Clerk for authentication. We store your email and user ID.</li>
                            <li><strong>Session Data:</strong> We store the duration, intent, and success/failure status of your sessions to provide analytics.</li>
                            <li><strong>Product Improvement:</strong> We collect anonymous usage data and feedback to improve the core product experience. By using Locked In, you agree to help us build a better tool for everyone.</li>
                            <li><strong>Guest Data:</strong> If you use Locked In as a guest, your session data is stored locally on your device (`localStorage`) and is not persisted to our databases.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">2. Payments</h2>
                        <p>
                            All payments are processed securely via <strong>Stripe</strong>. We do not store your credit card information on our servers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">3. Activity Monitoring</h2>
                        <p>
                            <strong>Strict Mode:</strong> We monitor document visibility state (e.g., tab switching) to enforce the "Lock In" contract. We do <strong>not</strong> record your screen, keystrokes, or browse history outside of this application.
                            We only know if our tab is active or hidden.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">4. Contact</h2>
                        <p>
                            For privacy concerns, please contact our support team.
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
