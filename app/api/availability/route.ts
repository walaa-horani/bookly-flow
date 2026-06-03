// app/api/availability/route.ts
import { NextResponse } from "next/server"
import { requireOrgContext } from "@/lib/org-context"
import { getBookingPage } from "@/lib/data/booking-page"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const ctx = await requireOrgContext()

  const page = await getBookingPage(ctx.orgId)
  if (!page) return NextResponse.json({ error: "Create a booking page first." }, { status: 400 })

  const slots: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[] =
    await req.json()

  await prisma.$transaction(
    slots.map((s) =>
      prisma.availability.upsert({
        where: { bookingPageId_dayOfWeek: { bookingPageId: page.id, dayOfWeek: s.dayOfWeek } },
        update: { startTime: s.startTime, endTime: s.endTime, isActive: s.isActive },
        create: { bookingPageId: page.id, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, isActive: s.isActive },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
