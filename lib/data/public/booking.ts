// lib/data/public/booking.ts
// WHITELISTED from CI grep rule: public booking flow, no session or orgId
import { prisma } from "@/lib/prisma"

export async function getActiveBookingPageBySlug(slug: string) {
  return prisma.bookingPage.findUnique({
    where: { slug, isActive: true },
    include: {
      org: { select: { tier: true } },
    },
  })
}

export async function getBookingPageWithSlots(slug: string) {
  return prisma.bookingPage.findUnique({
    where: { slug, isActive: true },
    include: { availability: true },
  })
}

export async function getBookingPageWithDayAvailability(slug: string, dayOfWeek: number) {
  return prisma.bookingPage.findUnique({
    where: { slug, isActive: true },
    include: {
      availability: { where: { dayOfWeek, isActive: true } },
    },
  })
}

// Returns the FCM tokens for every member of the org that owns this booking page.
// Kept separate from the appointment create so tokens never reach the public response.
export async function getOrgFcmTokensByBookingPageId(bookingPageId: string): Promise<string[]> {
  const page = await prisma.bookingPage.findUnique({
    where: { id: bookingPageId },
    select: {
      org: {
        select: {
          memberships: {
            select: { user: { select: { fcmTokens: { select: { token: true } } } } },
          },
        },
      },
    },
  })

  return page?.org.memberships.flatMap((m) => m.user.fcmTokens.map((t) => t.token)) ?? []
}

export async function getBookingPageForSlots(
  slug: string,
  dayOfWeek: number,
  dayStart: Date,
  dayEnd: Date,
) {
  return prisma.bookingPage.findUnique({
    where: { slug, isActive: true },
    include: {
      availability: { where: { dayOfWeek, isActive: true } },
      appointments: {
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          startTime: { gte: dayStart, lte: dayEnd },
        },
        select: { startTime: true, endTime: true },
      },
    },
  })
}

export async function getActiveBookingPages() {
  return prisma.bookingPage.findMany({
    where: { isActive: true },
    include: {
      org: {
        select: {
          id: true,
          name: true,
          tier: true,
        },
      },
    },
  })
}
