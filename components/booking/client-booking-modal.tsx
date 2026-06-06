"use client"

import { useState, useEffect, useCallback } from "react"
import { TimeSlotPicker } from "./time-slot-picker"
import { BookingForm } from "./booking-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"

type BookingPageData = {
  slug: string
  title: string
  description: string | null
  duration: number
  brandColor: string | null
  logoUrl: string | null
  price: any | null // Decimal
  currency: string
}

type Slot = { start: string; end: string }

type Props = {
  page: BookingPageData | null
  isOpen: boolean
  onClose: () => void
}

function getNext14Days(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split("T")[0]
  })
}

export function ClientBookingModal({ page, isOpen, onClose }: Props) {
  const days = getNext14Days()
  const [selectedDate, setSelectedDate] = useState<string>(days[0])
  const [slots, setSlots] = useState<Slot[]>([])
  const [price, setPrice] = useState<number | null>(null)
  const [currency, setCurrency] = useState("USD")
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [step, setStep] = useState<"pick-slot" | "fill-form">("pick-slot")

  // Reset modal state on page change or open/close
  useEffect(() => {
    if (isOpen && page) {
      setSelectedDate(days[0])
      setSelectedSlot(null)
      setStep("pick-slot")
    }
  }, [isOpen, page])

  const fetchSlots = useCallback(async (date: string) => {
    if (!page) return
    setLoadingSlots(true)
    setSlots([])
    setSelectedSlot(null)
    const res = await fetch(`/api/slots?slug=${page.slug}&date=${date}`)
    const data = await res.json()
    setSlots(data.slots ?? [])
    setPrice(data.price ? Number(data.price) : null)
    setCurrency(data.currency ?? "USD")
    setLoadingSlots(false)
  }, [page])

  useEffect(() => {
    if (isOpen && page) {
      fetchSlots(selectedDate)
    }
  }, [selectedDate, fetchSlots, isOpen, page])

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen && page) {
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = ""
      }
    }
  }, [isOpen, page])

  if (!isOpen || !page) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-background rounded-xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-muted/80"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        {step === "fill-form" && selectedSlot ? (
          <div className="p-6">
            <h2 className="text-xl font-bold tracking-tight mb-1">{page.title}</h2>
            <p className="text-xs text-muted-foreground mb-4">Complete your details to confirm booking</p>
            <BookingForm
              slot={selectedSlot}
              slug={page.slug}
              price={price}
              currency={currency}
              onBack={() => setStep("pick-slot")}
            />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div>
              {page.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.logoUrl} alt="Logo" className="h-10 object-contain mb-2" />
              )}
              <h2 className="text-xl font-bold tracking-tight">{page.title}</h2>
              {page.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{page.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {page.duration} min session{price ? ` · $${price} ${currency}` : " · Free"}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Select a date</p>
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                {days.map((day) => {
                  const d = new Date(day + "T00:00:00Z")
                  const isSelected = day === selectedDate
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(day)}
                      className={`flex flex-col items-center rounded-lg px-3 py-2 text-sm transition-all min-w-[56px] border ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow"
                          : "bg-background hover:bg-muted border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                        {d.toLocaleDateString("en", { weekday: "short", timeZone: "UTC" })}
                      </span>
                      <span className="font-semibold text-base mt-0.5">
                        {d.toLocaleDateString("en", { day: "numeric", timeZone: "UTC" })}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Available times</p>
              {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <TimeSlotPicker
                  slots={slots}
                  selected={selectedSlot}
                  onSelect={setSelectedSlot}
                />
              )}
            </div>

            {selectedSlot && (
              <Button className="w-full h-10 text-sm font-medium" onClick={() => setStep("fill-form")}>
                Continue →
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
