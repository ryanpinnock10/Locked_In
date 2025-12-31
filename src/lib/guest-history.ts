export interface GuestSession {
    intent: string
    duration: number
    cost: number
    status: 'completed' | 'failed'
    mode: 'strict' | 'flexible'
    completedAt: string // ISO date string
}

const GUEST_HISTORY_KEY = "locked_in_guest_history"

export const saveGuestSession = (session: GuestSession) => {
    if (typeof window === "undefined") return

    try {
        const history = getGuestHistory()
        history.push(session)
        localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(history))
    } catch (err) {
        console.error("Failed to save guest session", err)
    }
}

export const getGuestHistory = (): GuestSession[] => {
    if (typeof window === "undefined") return []

    try {
        const stored = localStorage.getItem(GUEST_HISTORY_KEY)
        return stored ? JSON.parse(stored) : []
    } catch (err) {
        console.error("Failed to read guest history", err)
        return []
    }
}

export const clearGuestHistory = () => {
    if (typeof window === "undefined") return
    localStorage.removeItem(GUEST_HISTORY_KEY)
}
