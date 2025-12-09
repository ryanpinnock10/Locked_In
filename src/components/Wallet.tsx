"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Plus, Wallet as WalletIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function Wallet() {
    const [balance, setBalance] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchBalance()
    }, [])

    const fetchBalance = async () => {
        try {
            const res = await fetch("/api/user/balance")
            if (res.ok) {
                const data = await res.json()
                setBalance(data.balance)
            }
        } catch (error) {
            console.error("Failed to fetch balance", error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(cents / 100)
    }

    const [selectedAmount, setSelectedAmount] = useState<number>(500)

    // ... (keep existing code)

    return (
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 p-6 relative overflow-hidden group">
            {/* Background Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

            <div className="relative z-10 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-zinc-400 text-sm uppercase tracking-widest">
                            <WalletIcon className="w-4 h-4" />
                            <span>Wallet Balance</span>
                        </div>
                        <div className="text-3xl font-bold font-mono text-white">
                            {loading ? (
                                <span className="animate-pulse">...</span>
                            ) : (
                                formatCurrency(balance || 0)
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                        {[500, 1000, 2000].map((amount) => (
                            <button
                                key={amount}
                                onClick={() => setSelectedAmount(amount)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedAmount === amount
                                    ? "bg-zinc-800 text-white shadow-sm"
                                    : "text-zinc-400 hover:text-white"
                                    }`}
                            >
                                ${amount / 100}
                            </button>
                        ))}
                    </div>

                    <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20"
                        onClick={async () => {
                            try {
                                const res = await fetch("/api/stripe/checkout", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ amount: selectedAmount })
                                })
                                const data = await res.json()
                                if (data.url) window.location.href = data.url
                            } catch (error) {
                                console.error("Checkout failed", error)
                                alert("Failed to start checkout")
                            }
                        }}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Funds
                    </Button>
                </div>
            </div>
        </Card>
    )
}
