// Called daily (e.g. via Vercel Cron or any scheduler) to send reminder emails
// to clients whose appointment is tomorrow.
// Protected by CRON_SECRET — callers must pass:
//   Authorization: Bearer <CRON_SECRET>
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendReminderEmail } from "@/lib/email"

// Vercel Cron Jobs send GET; POST is kept for manual triggering.
export async function GET(req: Request) {
  return POST(req)
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const tomorrowStart = new Date(now)
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1)
  tomorrowStart.setUTCHours(0, 0, 0, 0)

  const tomorrowEnd = new Date(tomorrowStart)
  tomorrowEnd.setUTCHours(23, 59, 59, 999)

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      startTime: { gte: tomorrowStart, lte: tomorrowEnd },
    },
    include: {
      bookingPage: {
        select: { slug: true, title: true },
      },
    },
  })

  const results = await Promise.allSettled(
    appointments.map(async (appt) => {
      await sendReminderEmail({
        to: appt.clientEmail,
        clientName: appt.clientName,
        providerName: appt.bookingPage.title,
        startTime: appt.startTime,
        bookingPageSlug: appt.bookingPage.slug,
      })
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      })
      return appt.id
    })
  )

  const sent = results.filter((r) => r.status === "fulfilled").length
  const failed = results
    .filter((r) => r.status === "rejected")
    .map((r) => (r as PromiseRejectedResult).reason?.message ?? "unknown")

  if (failed.length > 0) {
    console.error("[cron/reminders] failures:", failed)
  }

  return NextResponse.json({ sent, failed: failed.length, total: appointments.length })
}
