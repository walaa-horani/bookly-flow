// app/api/appointments/route.ts
// Public endpoint — no session required. Uses lib/data/public/booking.ts (whitelisted).
import { NextResponse } from "next/server"
import { getActiveBookingPageBySlug, getOrgFcmTokensByBookingPageId } from "@/lib/data/public/booking"
import { prisma } from "@/lib/prisma"
import { sendNewBookingNotification } from "@/lib/firebase-admin"
import { sendConfirmationEmail } from "@/lib/email"

const FREE_TIER_DAILY_LIMIT = 5
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  const { slug, clientName, clientEmail, startTime, endTime, notes } = await req.json()

  // Input validation
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
  if (!clientName || typeof clientName !== "string" || clientName.trim().length === 0 || clientName.length > 200) {
    return NextResponse.json({ error: "A valid name is required (max 200 characters)." }, { status: 400 })
  }
  if (!clientEmail || !EMAIL_RE.test(clientEmail)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 })
  }
  if (notes && (typeof notes !== "string" || notes.length > 2000)) {
    return NextResponse.json({ error: "Notes must be under 2000 characters." }, { status: 400 })
  }

  const start = new Date(startTime)
  const end = new Date(endTime)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid date values." }, { status: 400 })
  }
  if (start >= end) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 })
  }
  if (start <= new Date()) {
    return NextResponse.json({ error: "Cannot book a slot in the past." }, { status: 400 })
  }

  const bookingPage = await getActiveBookingPageBySlug(slug)

  if (!bookingPage) {
    return NextResponse.json({ error: "Booking page not found." }, { status: 404 })
  }

  // Tier comes from organization
  const tier = bookingPage.org.tier

  if (tier === "FREE") {
    const todayStart = new Date(start)
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayEnd = new Date(start)
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

  // Standard interval overlap: existing.start < new.end AND existing.end > new.start
  const conflict = await prisma.appointment.findFirst({
    where: {
      bookingPageId: bookingPage.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { lt: end },
      endTime: { gt: start },
    },
  })

  if (conflict) {
    return NextResponse.json({ error: "Slot no longer available." }, { status: 409 })
  }

  const appointment = await prisma.appointment.create({
    data: {
      bookingPageId: bookingPage.id,
      clientName: clientName.trim(),
      clientEmail,
      startTime: start,
      endTime: end,
      notes: notes ?? null,
      status: "CONFIRMED",
    },
  })

  // Confirm the booking to the client.
  try {
    await sendConfirmationEmail({
      to: appointment.clientEmail,
      clientName: appointment.clientName,
      providerName: bookingPage.title,
      startTime: appointment.startTime,
      bookingPageSlug: bookingPage.slug,
    })
  } catch (err) {
    console.error("[appointments] confirmation email failed:", err)
  }

  // Create in-app notification for org members.
  try {
    const timeStr = appointment.startTime.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    await prisma.orgNotification.create({
      data: {
        orgId: bookingPage.orgId,
        type: "NEW_BOOKING",
        title: "New Booking!",
        body: `${appointment.clientName} booked at ${timeStr}`,
      },
    })
  } catch (err) {
    console.error("[appointments] in-app notification failed:", err)
  }

  // Send FCM push to all org member devices.
  try {
    const tokens = await getOrgFcmTokensByBookingPageId(bookingPage.id)
    console.log(`[appointments] booking ${appointment.id}: found ${tokens.length} FCM token(s)`)
    if (tokens.length > 0) {
      await sendNewBookingNotification(tokens, {
        clientName: appointment.clientName,
        startTime: appointment.startTime.toISOString(),
      })
      console.log(`[appointments] FCM push dispatched for booking ${appointment.id}`)
    }
  } catch (err) {
    // A push failure must never fail the booking itself.
    console.error("[appointments] FCM notification failed:", err)
  }

  return NextResponse.json({ id: appointment.id }, { status: 201 })
}
