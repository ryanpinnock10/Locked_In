"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function AnalyticsTracker() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const isMounted = useRef(false)

    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true
            return
        }

        const url = window.location.href
        const referrer = document.referrer

        const trackPageView = async () => {
            try {
                await fetch("/api/analytics/track", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        url,
                        path: pathname,
                        referrer,
                    }),
                })
            } catch (err) {
                console.error("Failed to track page view:", err)
            }
        }

        // Debounce slightly to avoid double firing on strict mode or rapid changes
        const timer = setTimeout(() => {
            trackPageView()
        }, 500)

        return () => clearTimeout(timer)
    }, [pathname, searchParams])

    return null
}
