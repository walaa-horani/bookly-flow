import { prisma } from "@/lib/prisma"
import { BookingPageView } from "@/components/booking/booking-page-view"
import { notFound } from "next/navigation"

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const page = await prisma.bookingPage.findUnique({
    where: { slug, isActive: true },
    select: {
      slug: true,
      title: true,
      description: true,
      duration: true,
      brandColor: true,
      logoUrl: true,
      user: { select: { tier: true } },
    },
  })

  if (!page) notFound()

  return (
    <BookingPageView
      page={{
        slug: page.slug,
        title: page.title,
        description: page.description,
        duration: page.duration,
        brandColor: page.user.tier === "PRO" ? page.brandColor : null,
        logoUrl: page.user.tier === "PRO" ? page.logoUrl : null,
      }}
    />
  )
}
