"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Slot = { start: string; end: string }

type Props = {
  slot: Slot
  slug: string
  price: number | null
  currency: string
  onBack: () => void
}

export function BookingForm({ slot, slug, price, currency, onBack }: Props) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        clientName: name,
        clientEmail: email,
        startTime: slot.start,
        endTime: slot.end,
        notes,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? "Booking failed.")
      return
    }

    if (price) {
      const checkoutRes = await fetch("/api/paddle/booking-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: data.id }),
      })
      const checkoutData = await checkoutRes.json()
      if (checkoutData.checkoutUrl) {
        window.location.href = checkoutData.checkoutUrl
        return
      }
    }

    window.location.href = `/book/${slug}/confirmed?appt=${data.id}`
  }

  const start = new Date(slot.start)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/40 p-4 text-sm">
        <p className="font-medium">
          {start.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <p className="text-muted-foreground">
          {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
        {price && (
          <p className="mt-1 font-semibold">
            {currency} {price}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label>Your Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Email Address</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Booking…" : price ? "Pay & Book" : "Confirm Booking"}
          </Button>
        </div>
      </form>
    </div>
  )
}
