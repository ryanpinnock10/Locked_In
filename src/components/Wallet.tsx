"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Plus, Wallet as WalletIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function Wallet() {
    const [balance, setBalance] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const searchParams = useSearchParams()
    const success = searchParams.get("success")

    useEffect(() => {
        fetchBalance()

        // If we just came back from a successful checkout, 
        // poll every 3 seconds for 30 seconds or until balance updates
        if (success === "true") {
            const startBalance = balance;
            let checkCount = 0;
            const maxChecks = 10; // 30 seconds total

            const interval = setInterval(async () => {
                checkCount++;
                const res = await fetch("/api/user/balance")
                if (res.ok) {
                    const data = await res.json()
                    if (data.balance !== startBalance && startBalance !== null) {
                        setBalance(data.balance)
                        clearInterval(interval)
                    }
                }

                if (checkCount >= maxChecks) {
                    clearInterval(interval)
                }
            }, 3000)

            return () => clearInterval(interval)
        }
    }, [success, balance])

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
    const [isCustom, setIsCustom] = useState(false)
    const [customValue, setCustomValue] = useState("500") // $500 default for custom

    const handleCheckout = async () => {
        const amount = isCustom ? Math.round(parseFloat(customValue || "0") * 100) : selectedAmount
        if (isNaN(amount) || amount < 100) {
            alert("Please enter a valid amount (minimum $1.00)")
            return
        }

        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount })
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: "Failed to connect to checkout" }))
                throw new Error(errorData.error || "Checkout failed")
            }

            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            } else {
                throw new Error("No checkout URL returned")
            }
        } catch (error: any) {
            console.error("Checkout failed:", error)
            alert(error.message || "Failed to start checkout")
        }
    }

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

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                            {[500, 1000, 2000].map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => {
                                        setSelectedAmount(amount)
                                        setIsCustom(false)
                                    }}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${!isCustom && selectedAmount === amount
                                        ? "bg-zinc-800 text-white shadow-sm"
                                        : "text-zinc-400 hover:text-white"
                                        }`}
                                >
                                    ${amount / 100}
                                </button>
                            ))}
                            <button
                                onClick={() => setIsCustom(true)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isCustom
                                    ? "bg-zinc-800 text-white shadow-sm"
                                    : "text-zinc-400 hover:text-white"
                                    }`}
                            >
                                Custom
                            </button>
                        </div>

                        {isCustom && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex-1 min-w-[100px]"
                            >
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                                    <input
                                        type="number"
                                        value={customValue}
                                        onChange={(e) => setCustomValue(e.target.value)}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="1"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 pl-6 pr-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 py-5 text-base font-bold"
                        onClick={handleCheckout}
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add {isCustom ? `$${parseFloat(customValue || '0').toFixed(2)}` : `$${(selectedAmount / 100).toFixed(2)}`} Credits
                    </Button>
                </div>
            </div>
        </Card>
    )
}
