// lib/data/appointments.ts
import { prisma } from "@/lib/prisma"

export async function listOrgAppointments(orgId: string, limit = 100) {
  const page = await prisma.bookingPage.findUnique({ where: { orgId }, select: { id: true } })
  if (!page) return []
  return prisma.appointment.findMany({
    where: { bookingPageId: page.id },
    orderBy: { startTime: "desc" },
    take: limit,
  })
}

export async function countTodayAppointments(bookingPageId: string, date: Date): Promise<number> {
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setUTCHours(23, 59, 59, 999)
  return prisma.appointment.count({
    where: {
      bookingPageId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { gte: start, lte: end },
    },
  })
}
