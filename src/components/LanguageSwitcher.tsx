"use client"

import { useTranslation } from "react-i18next"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEffect, useState } from "react"
import "@/lib/i18n" // Import config to ensure init

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文 (Chinese)' },
    { code: 'zh-CN', label: 'Chinese (Simplified) / 简体中文' },
    { code: 'zh-TW', label: 'Chinese (Traditional) / 繁體中文' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
    { code: 'es', label: 'Spanish / Español' },
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية (Arabic)' },
    { code: 'bn', label: 'বাংলা (Bengali)' },
    { code: 'ru', label: 'Русский (Russian)' },
    { code: 'pt', label: 'Português' },
    { code: 'ur', label: 'اردو (Urdu)' },
    { code: 'id', label: 'Bahasa Indonesia' },
    { code: 'de', label: 'Deutsch' },
    { code: 'ja', label: '日本語 (Japanese)' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'ko', label: '한국어 (Korean)' },
]

export function LanguageSwitcher() {
    const { i18n } = useTranslation()
    const [mounted, setMounted] = useState(false)

    // Avoid hydration mismatch by waiting for mount
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white transition-colors">
                    <Globe className="h-5 w-5" />
                    <span className="sr-only">Switch Language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 h-[300px] overflow-y-auto">
                {LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        className={`text-zinc-300 hover:text-white focus:bg-zinc-800 cursor-pointer ${i18n.language === lang.code ? 'bg-zinc-800 text-white font-medium' : ''}`}
                        onClick={() => i18n.changeLanguage(lang.code)}
                    >
                        {lang.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
