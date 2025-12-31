import { Button } from "@/components/ui/button"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { Lock, ShieldAlert, Zap, Timer } from "lucide-react"
import { useTranslation, Trans } from "react-i18next"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import "@/lib/i18n" // Ensure init

export function LandingPage({ onEnterApp }: { onEnterApp: () => void }) {
    const { t } = useTranslation()

    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 max-w-4xl mx-auto animate-in fade-in duration-700 relative">

            {/* Language Switcher - Top Right */}
            <div className="absolute top-4 right-4 z-50">
                <LanguageSwitcher />
            </div>

            {/* Hero Section */}
            <div className="space-y-6 mb-16 mt-12 md:mt-0">
                <div className="bg-blue-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                    <Lock className="w-10 h-10 text-blue-400" />
                </div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-4">
                    <Trans i18nKey="hero.title">
                        Locked <span className="text-blue-500">In</span>.
                    </Trans>
                </h1>

                <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                    {t('hero.subtitle')} <br />
                    <span className="text-zinc-200 font-medium">{t('hero.description')}</span>
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                    <Button
                        onClick={onEnterApp}
                        size="lg"
                        className="text-lg px-8 h-14 bg-white text-black hover:bg-zinc-200 transition-all transform hover:scale-105"
                    >
                        {t('hero.startGuest')}
                    </Button>

                    <SignUpButton mode="modal">
                        <Button
                            size="lg"
                            className="text-lg px-8 h-14 bg-white text-black hover:bg-zinc-200 transition-all"
                        >
                            {t('hero.signUp')}
                        </Button>
                    </SignUpButton>
                </div>
            </div>

            {/* Problem Section: The Cost of Distraction */}
            <div className="w-full max-w-4xl mx-auto mb-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center text-left">
                <div className="space-y-6">
                    <h2 className="text-3xl font-bold text-white">
                        {t('problem.titlePart1')} <br />
                        <span className="text-red-500">{t('problem.titlePart2')}</span>
                    </h2>
                    <p className="text-zinc-400 text-lg leading-relaxed">
                        <Trans i18nKey="problem.research">
                            Every notification, every &quot;quick check&quot; of social media resets your focus timer.
                            Research shows it takes <strong>23 minutes</strong> to regain deep focus after a distraction.
                        </Trans>
                    </p>
                    <p className="text-zinc-400 text-lg leading-relaxed">
                        <Trans i18nKey="problem.algorithm">
                            You aren&apos;t just wasting moments; you are defaulting on your potential. The algorithms are betting against you, and right now, <strong>they are winning.</strong>
                        </Trans>
                    </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                    <div className="space-y-6 relative z-10">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-red-500/10 rounded-lg shrink-0">
                                <ShieldAlert className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{t('problem.doomSpiral')}</h3>
                                <p className="text-sm text-zinc-400 mt-1">{t('problem.doomSpiralDesc')}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-orange-500/10 rounded-lg shrink-0">
                                <Timer className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{t('problem.fragmented')}</h3>
                                <p className="text-sm text-zinc-400 mt-1">{t('problem.fragmentedDesc')}</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-zinc-800">
                            <p className="text-white font-medium">{t('problem.solution')}</p>
                            <p className="text-blue-400 font-bold text-lg">{t('problem.consequence')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <h2 className="text-2xl font-bold text-white mb-8">{t('features.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                <FeatureCard
                    icon={<Timer className="w-6 h-6 text-purple-400" />}
                    title={t('features.timer')}
                    description={t('features.timerDesc')}
                />
                <FeatureCard
                    icon={<ShieldAlert className="w-6 h-6 text-red-400" />}
                    title={t('features.stakes')}
                    description={t('features.stakesDesc')}
                />
                <FeatureCard
                    icon={<Zap className="w-6 h-6 text-yellow-400" />}
                    title={t('features.hyperFocus')}
                    description={t('features.hyperFocusDesc')}
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
