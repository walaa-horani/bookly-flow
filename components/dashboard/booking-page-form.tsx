"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { BookingPage } from "@/app/generated/prisma/client"

type Props = {
  existing?: BookingPage | null
}

export function BookingPageForm({ existing }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(existing?.title ?? "")
  const [slug, setSlug] = useState(existing?.slug ?? "")
  const [description, setDescription] = useState(existing?.description ?? "")
  const [duration, setDuration] = useState(existing?.duration ?? 30)
  const [price, setPrice] = useState(existing?.price ? String(existing.price) : "")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const method = existing ? "PUT" : "POST"
  const url = existing ? `/api/booking-page/${existing.id}` : "/api/booking-page"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        description,
        duration: Number(duration),
        price: price ? Number(price) : null,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? "Save failed.")
      return
    }

    router.push("/dashboard/booking-page")
    router.refresh()
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>{existing ? "Edit Booking Page" : "Create Booking Page"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>
              Slug{" "}
              <span className="text-xs text-muted-foreground">
                (your URL: /book/your-slug)
              </span>
            </Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              pattern="[a-z0-9\-]+"
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1">
            <Label>Session Duration (minutes)</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min={15}
              step={15}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>
              Session Price (USD){" "}
              <span className="text-xs text-muted-foreground">leave empty for free</span>
            </Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min={0}
              step={0.01}
              placeholder="0.00"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
