import { ScrollArea } from "@/components/ui/scroll-area"

interface CountryStatsProps {
    data: {
        country: string
        visitors: number
        percentage: number
    }[]
}

export function CountryStats({ data }: CountryStatsProps) {
    return (
        <ScrollArea className="h-[300px] w-full pr-4">
            <div className="space-y-4">
                {data.map((item) => (
                    <div key={item.country} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{getFlagEmoji(item.country)}</span>
                            <span className="text-sm font-medium text-white">{item.country === "Unknown" ? "Unknown Region" : item.country}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-zinc-400">{item.visitors} visitors</div>
                            <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500"
                                    style={{ width: `${item.percentage}%` }}
                                />
                            </div>
                            <div className="text-xs text-zinc-500 w-8 text-right">{item.percentage}%</div>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    )
}

function getFlagEmoji(countryCode: string) {
    if (!countryCode || countryCode === "Unknown" || countryCode.length !== 2) return "🌍"

    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}
