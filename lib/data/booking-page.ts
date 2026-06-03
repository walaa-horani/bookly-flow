// lib/data/booking-page.ts
import { prisma } from "@/lib/prisma"

export async function getBookingPage(orgId: string) {
  return prisma.bookingPage.findUnique({ where: { orgId } })
}

export async function createBookingPage(
  orgId: string,
  data: {
    title: string
    slug: string
    description?: string | null
    duration: number
    price?: number | null
    currency?: string
  }
) {
  return prisma.bookingPage.create({ data: { orgId, ...data } })
}

export async function updateBookingPage(
  orgId: string,
  id: string,
  data: {
    title: string
    slug: string
    description?: string | null
    duration: number
    price?: number | null
  }
) {
  // compound where: { id, orgId } is IDOR protection — a foreign id returns null
  return prisma.bookingPage.update({ where: { id, orgId }, data })
}

export async function getBookingPageWithAvailability(orgId: string) {
  return prisma.bookingPage.findUnique({
    where: { orgId },
    include: { availability: { orderBy: { dayOfWeek: "asc" } } },
  })
}
