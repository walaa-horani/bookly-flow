import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookingPage = await prisma.bookingPage.findUnique({
    where: { userId: session.user.id },
  })
  if (!bookingPage) {
    return NextResponse.json({ error: "Create a booking page first." }, { status: 400 })
  }

  const slots: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[] =
    await req.json()

  await prisma.$transaction(
    slots.map((s) =>
      prisma.availability.upsert({
        where: {
          bookingPageId_dayOfWeek: {
            bookingPageId: bookingPage.id,
            dayOfWeek: s.dayOfWeek,
          },
        },
        update: { startTime: s.startTime, endTime: s.endTime, isActive: s.isActive },
        create: {
          bookingPageId: bookingPage.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isActive: s.isActive,
        },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
