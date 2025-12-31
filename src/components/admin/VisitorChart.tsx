"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface VisitorChartProps {
    data: {
        date: string
        visitors: number
        pageViews: number
    }[]
}

export function VisitorChart({ data }: VisitorChartProps) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                <XAxis
                    dataKey="date"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a" }}
                    itemStyle={{ color: "#e4e4e7" }}
                />
                <Line
                    type="monotone"
                    dataKey="visitors"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    name="Unique Visitors"
                />
                <Line
                    type="monotone"
                    dataKey="pageViews"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                    name="Page Views"
                />
            </LineChart>
        </ResponsiveContainer>
    )
}
