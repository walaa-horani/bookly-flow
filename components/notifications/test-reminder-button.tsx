"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function TestReminderButton() {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch("/api/reminders/test", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } })
      const data = await res.json()
      if (!res.ok) {
        setStatus(data.error ?? "Failed to send.")
      } else {
        setStatus(`Reminder sent to ${data.to} (appt ${data.appointmentId.slice(0, 8)}…)`)
      }
    } catch {
      setStatus("Failed to send.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
        {loading ? "Sending…" : "Send test reminder email"}
      </Button>
      {status && <p className="text-xs text-muted-foreground max-w-xs text-right">{status}</p>}
    </div>
  )
}
