// app/api/appointments/route.ts
// Public endpoint — no session required. Uses lib/data/public/booking.ts (whitelisted).
import { NextResponse } from "next/server"
import { getActiveBookingPageBySlug } from "@/lib/data/public/booking"
import { prisma } from "@/lib/prisma"

const FREE_TIER_DAILY_LIMIT = 5

export async function POST(req: Request) {
  const { slug, clientName, clientEmail, startTime, endTime, notes } = await req.json()

  const bookingPage = await getActiveBookingPageBySlug(slug)

  if (!bookingPage) {
    return NextResponse.json({ error: "Booking page not found." }, { status: 404 })
  }

  // Tier comes from org (post-migration) or user (pre-migration fallback)
  const tier = bookingPage.org?.tier ?? bookingPage.user?.tier ?? "FREE"

  if (tier === "FREE") {
    const todayStart = new Date(startTime)
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayEnd = new Date(startTime)
    todayEnd.setUTCHours(23, 59, 59, 999)

    const todayCount = await prisma.appointment.count({
      where: {
        bookingPageId: bookingPage.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { gte: todayStart, lte: todayEnd },
      },
    })

    if (todayCount >= FREE_TIER_DAILY_LIMIT) {
      return NextResponse.json(
        { error: "This provider isn't accepting more bookings today — please try again tomorrow." },
        { status: 429 }
      )
    }
  }

  const conflict = await prisma.appointment.findFirst({
    where: {
      bookingPageId: bookingPage.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      OR: [
        { startTime: { lt: new Date(endTime), gte: new Date(startTime) } },
        { endTime: { gt: new Date(startTime), lte: new Date(endTime) } },
      ],
    },
  })

  if (conflict) {
    return NextResponse.json({ error: "Slot no longer available." }, { status: 409 })
  }

  const appointment = await prisma.appointment.create({
    data: {
      bookingPageId: bookingPage.id,
      clientName,
      clientEmail,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      notes: notes ?? null,
      status: bookingPage.price ? "PENDING" : "CONFIRMED",
    },
  })

  return NextResponse.json(appointment, { status: 201 })
}
