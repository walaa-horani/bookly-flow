import { NextResponse } from "next/server"
import { generateSlots } from "@/lib/slots"
import { getBookingPageForSlots } from "@/lib/data/public/booking"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get("slug")
  const dateParam = searchParams.get("date")

  if (!slug || !dateParam) {
    return NextResponse.json({ error: "slug and date required" }, { status: 400 })
  }

  const date = new Date(dateParam + "T00:00:00.000Z")
  const dayOfWeek = date.getUTCDay()

  const dayStart = new Date(dateParam + "T00:00:00.000Z")
  const dayEnd = new Date(dateParam + "T23:59:59.999Z")

  const bookingPage = await getBookingPageForSlots(slug, dayOfWeek, dayStart, dayEnd)

  if (!bookingPage) {
    return NextResponse.json({ error: "Booking page not found" }, { status: 404 })
  }

  const availability = bookingPage.availability[0]
  if (!availability) {
    return NextResponse.json({ slots: [] })
  }

  const existing = bookingPage.appointments

  const slots = generateSlots({
    date,
    availability,
    durationMinutes: bookingPage.duration,
    existingAppointments: existing,
  })

  return NextResponse.json({
    slots: slots.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
    })),
    price: bookingPage.price,
    currency: bookingPage.currency,
    duration: bookingPage.duration,
  })
}
