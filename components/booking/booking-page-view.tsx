"use client"

import { useState, useEffect, useCallback } from "react"
import { TimeSlotPicker } from "./time-slot-picker"
import { BookingForm } from "./booking-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type BookingPageData = {
  slug: string
  title: string
  description: string | null
  duration: number
  brandColor: string | null
  logoUrl: string | null
}

type Slot = { start: string; end: string }

type Props = {
  page: BookingPageData
}

function getNext14Days(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split("T")[0]
  })
}

export function BookingPageView({ page }: Props) {
  const days = getNext14Days()
  const [selectedDate, setSelectedDate] = useState<string>(days[0])
  const [slots, setSlots] = useState<Slot[]>([])
  const [price, setPrice] = useState<number | null>(null)
  const [currency, setCurrency] = useState("USD")
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [step, setStep] = useState<"pick-slot" | "fill-form">("pick-slot")

  const fetchSlots = useCallback(async (date: string) => {
    setLoadingSlots(true)
    setSlots([])
    setSelectedSlot(null)
    const res = await fetch(`/api/slots?slug=${page.slug}&date=${date}`)
    const data = await res.json()
    setSlots(data.slots ?? [])
    setPrice(data.price ? Number(data.price) : null)
    setCurrency(data.currency ?? "USD")
    setLoadingSlots(false)
  }, [page.slug])

  useEffect(() => {
    fetchSlots(selectedDate)
  }, [selectedDate, fetchSlots])

  if (step === "fill-form" && selectedSlot) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 flex items-start justify-center pt-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{page.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingForm
              slot={selectedSlot}
              slug={page.slug}
              price={price}
              currency={currency}
              onBack={() => setStep("pick-slot")}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex items-start justify-center pt-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          {page.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={page.logoUrl} alt="Logo" className="h-10 object-contain mb-2" />
          )}
          <CardTitle>{page.title}</CardTitle>
          {page.description && (
            <p className="text-sm text-muted-foreground">{page.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {page.duration} min session{price ? ` · $${price} ${currency}` : " · Free"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Select a date</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((day) => {
                const d = new Date(day + "T00:00:00Z")
                const isSelected = day === selectedDate
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(day)}
                    className={`flex flex-col items-center rounded-lg px-3 py-2 text-sm transition-colors min-w-[56px] border ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-border"
                    }`}
                  >
                    <span className="text-xs">
                      {d.toLocaleDateString("en", { weekday: "short", timeZone: "UTC" })}
                    </span>
                    <span className="font-semibold">
                      {d.toLocaleDateString("en", { day: "numeric", timeZone: "UTC" })}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Available times</p>
            {loadingSlots ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <TimeSlotPicker
                slots={slots}
                selected={selectedSlot}
                onSelect={setSelectedSlot}
              />
            )}
          </div>

          {selectedSlot && (
            <Button className="w-full" onClick={() => setStep("fill-form")}>
              Continue →
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
