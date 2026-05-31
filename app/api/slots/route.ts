import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateSlots } from "@/lib/slots"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get("slug")
  const dateParam = searchParams.get("date")

  if (!slug || !dateParam) {
    return NextResponse.json({ error: "slug and date required" }, { status: 400 })
  }

  const date = new Date(dateParam + "T00:00:00.000Z")
  const dayOfWeek = date.getUTCDay()

  const bookingPage = await prisma.bookingPage.findUnique({
    where: { slug, isActive: true },
    include: {
      availability: { where: { dayOfWeek, isActive: true } },
    },
  })

  if (!bookingPage) {
    return NextResponse.json({ error: "Booking page not found" }, { status: 404 })
  }

  const availability = bookingPage.availability[0]
  if (!availability) {
    return NextResponse.json({ slots: [] })
  }

  const dayStart = new Date(dateParam + "T00:00:00.000Z")
  const dayEnd = new Date(dateParam + "T23:59:59.999Z")

  const existing = await prisma.appointment.findMany({
    where: {
      bookingPageId: bookingPage.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { gte: dayStart, lte: dayEnd },
    },
    select: { startTime: true, endTime: true },
  })

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
