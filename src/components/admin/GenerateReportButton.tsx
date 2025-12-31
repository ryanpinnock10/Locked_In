"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"

export function GenerateReportButton() {
    const [loading, setLoading] = useState(false)

    const handleGenerate = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/generate-report", { method: "POST" })
            if (res.ok) {
                alert("Threat Report sent to your email!")
            } else {
                alert("Failed to generate report.")
            }
        } catch (e) {
            console.error(e)
            alert("Error generating report.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
            Generate Threat Report
        </Button>
    )
}
