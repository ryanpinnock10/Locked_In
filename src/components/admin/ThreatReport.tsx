"use client"

import { useCompletion } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileText, Loader2, AlertTriangle, RefreshCw } from "lucide-react"
import ReactMarkdown from 'react-markdown'

export function ThreatReport() {
    const { completion, complete, isLoading, error } = useCompletion({
        api: "/api/admin/threat-report",
    })

    const handleGenerate = async () => {
        await complete("")
    }

    return (
        <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <h3 className="text-lg font-bold text-white">AI Threat Report</h3>
                </div>
                <Button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    size="sm"
                    className="bg-red-900/20 hover:bg-red-900/40 text-red-200 border border-red-900/50"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    {completion ? "Regenerate" : "Generate Analysis"}
                </Button>
            </div>

            {error && (
                <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-md text-red-200 text-sm">
                    Error generating report. Please try again.
                </div>
            )}

            {completion ? (
                <div className="mt-2 prose prose-invert prose-sm max-w-none bg-black/20 p-4 rounded-md border border-zinc-800">
                    <ReactMarkdown>{completion}</ReactMarkdown>
                </div>
            ) : (
                <div className="h-32 flex items-center justify-center text-zinc-500 text-sm italic border border-dashed border-zinc-800 rounded-md">
                    Click generate to analyze business threats...
                </div>
            )}
        </Card>
    )
}
