import { Button } from "@/components/ui/button"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { Lock, ShieldAlert, Zap, Timer } from "lucide-react"

export function LandingPage({ onEnterApp }: { onEnterApp: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 max-w-4xl mx-auto animate-in fade-in duration-700">

            {/* Hero Section */}
            <div className="space-y-6 mb-16">
                <div className="bg-blue-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                    <Lock className="w-10 h-10 text-blue-400" />
                </div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-4">
                    Locked <span className="text-blue-500">In</span>.
                </h1>

                <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                    The most aggressive focus tool on the web. <br />
                    <span className="text-zinc-200 font-medium">Distract yourself, and it costs you real money.</span>
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                    <Button
                        onClick={onEnterApp}
                        size="lg"
                        className="text-lg px-8 h-14 bg-white text-black hover:bg-zinc-200 transition-all transform hover:scale-105"
                    >
                        Start Guest Session
                    </Button>

                    <SignUpButton mode="modal">
                        <Button
                            size="lg"
                            variant="outline"
                            className="text-lg px-8 h-14 border-zinc-700 hover:bg-zinc-800 transition-all"
                        >
                            Sign Up Free
                        </Button>
                    </SignUpButton>
                </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                <FeatureCard
                    icon={<Timer className="w-6 h-6 text-purple-400" />}
                    title="Strict Timer"
                    description="Set your goal. Once you lock in, there is no pausing. You commit or you fail."
                />
                <FeatureCard
                    icon={<ShieldAlert className="w-6 h-6 text-red-400" />}
                    title="Financial Penalty"
                    description="If you quit early or try to give up, you pay a penalty. Put your wallet on the line."
                />
                <FeatureCard
                    icon={<Zap className="w-6 h-6 text-yellow-400" />}
                    title="Deep Focus"
                    description="Minimalist 'Frozen' interface removes all clutter. Just you and the countdown."
                />
            </div>

            {/* Footer */}
            <footer className="mt-20 pt-8 border-t border-zinc-900 w-full text-zinc-500 text-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <p>© {new Date().getFullYear()} Locked In. All rights reserved.</p>
                <div className="flex gap-6">
                    <a href="/terms" className="hover:text-zinc-300 transition-colors">Terms of Service</a>
                    <a href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</a>
                </div>
            </footer>
        </div>
    )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl text-left hover:border-zinc-700 transition-colors">
            <div className="mb-4">{icon}</div>
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-zinc-400 leading-relaxed">{description}</p>
        </div>
    )
}
