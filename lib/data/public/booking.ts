// lib/data/public/booking.ts
// WHITELISTED from CI grep rule: public booking flow, no session or orgId
import { prisma } from "@/lib/prisma"

export async function getActiveBookingPageBySlug(slug: string) {
  return prisma.bookingPage.findUnique({
    where: { slug, isActive: true },
    include: {
      org: { select: { tier: true } },
      // fallback for pre-migration rows
      user: { select: { tier: true } },
    },
  })
}

export async function getBookingPageWithSlots(slug: string) {
  return prisma.bookingPage.findUnique({
    where: { slug, isActive: true },
    include: { availability: true },
  })
}
