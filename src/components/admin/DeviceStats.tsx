"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts"

interface DeviceStatsProps {
    data: {
        name: string
        value: number
        color: string
    }[]
}

export function DeviceStats({ data }: DeviceStatsProps) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a" }}
                    itemStyle={{ color: "#e4e4e7" }}
                />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    )
}
