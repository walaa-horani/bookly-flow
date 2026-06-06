"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function TestNotificationButton() {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    setStatus(null)
    try {
      // Make sure the browser has granted permission first — otherwise the
      // token was never registered and nothing will arrive.
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        await Notification.requestPermission()
      }

      const res = await fetch("/api/fcm/test", { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        setStatus(data.error ?? "Failed to send.")
      } else if (data.tokenCount === 0) {
        setStatus("No device registered. Grant notification permission, then reload this page.")
      } else {
        setStatus(`Sent to ${data.tokenCount} device(s). Check for the notification.`)
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
        {loading ? "Sending…" : "Send test notification"}
      </Button>
      {status && <p className="text-xs text-muted-foreground max-w-xs text-right">{status}</p>}
    </div>
  )
}
