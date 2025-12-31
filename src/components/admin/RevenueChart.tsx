"use client"

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"

interface RevenueChartProps {
    data: { date: string; amount: number }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#71717a"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(str) => {
                            const date = new Date(str)
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        }}
                    />
                    <YAxis
                        stroke="#71717a"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }}
                        itemStyle={{ color: "#fff" }}
                        labelStyle={{ color: "#71717a", marginBottom: "4px" }}
                        formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, "Revenue"]}
                    />
                    <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#4ade80"
                        fillOpacity={1}
                        fill="url(#colorAmount)"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
