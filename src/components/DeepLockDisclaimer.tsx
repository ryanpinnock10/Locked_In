"use client"

import { motion } from "framer-motion"
import { ShieldAlert, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"

interface DeepLockDisclaimerProps {
    onConfirm: () => void
    onCancel: () => void
}

export function DeepLockDisclaimer({ onConfirm, onCancel }: DeepLockDisclaimerProps) {
    const { t } = useTranslation()

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-6"
            >
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-white">{t('deepLock.title')}</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        {t('deepLock.description')}
                    </p>
                </div>

                <div className="space-y-4 bg-black/40 rounded-2xl p-6 border border-zinc-800/50">
                    <div className="flex gap-3 text-xs">
                        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-red-500" />
                        </div>
                        <p className="text-zinc-300">
                            <span className="text-white font-semibold">{t('deepLock.strictFullscreen')}</span> {t('deepLock.strictFullscreenDesc')}
                        </p>
                    </div>
                    <div className="flex gap-3 text-xs">
                        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-red-500" />
                        </div>
                        <p className="text-zinc-300">
                            <span className="text-white font-semibold">{t('deepLock.instantPenalty')}</span> {t('deepLock.instantPenaltyDesc')}
                        </p>
                    </div>
                    <div className="flex gap-3 text-xs">
                        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-red-500" />
                        </div>
                        <p className="text-zinc-300">
                            <span className="text-white font-semibold">{t('deepLock.liabilityWaiver')}</span> {t('deepLock.liabilityWaiverDesc')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <Button
                        onClick={onConfirm}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {t('deepLock.agreeButton')}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        className="w-full text-zinc-500 hover:text-white hover:bg-zinc-800 h-12 rounded-xl"
                    >
                        {t('deepLock.cancelButton')}
                    </Button>
                </div>

                <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest font-semibold">
                    {t('deepLock.footer')}
                </p>
            </motion.div>
        </div>
    )
}

