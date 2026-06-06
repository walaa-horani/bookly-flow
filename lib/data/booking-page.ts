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
  const page = await prisma.bookingPage.create({ data: { orgId, ...data } })

  const availabilityData = Array.from({ length: 7 }, (_, i) => ({
    bookingPageId: page.id,
    dayOfWeek: i,
    startTime: "09:00",
    endTime: "17:00",
    isActive: i >= 1 && i <= 5,
  }))

  await Promise.all(
    availabilityData.map((slot) =>
      prisma.availability.create({ data: slot })
    )
  )

  return page
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

export async function getBookingPageWithCount(orgId: string) {
  return prisma.bookingPage.findUnique({
    where: { orgId },
    include: { _count: { select: { appointments: true } } },
  })
}

export async function getBookingPageBySlug(slug: string) {
  return prisma.bookingPage.findUnique({ where: { slug } })
}
