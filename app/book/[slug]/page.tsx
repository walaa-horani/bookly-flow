// app/book/[slug]/page.tsx
import { getActiveBookingPageBySlug } from "@/lib/data/public/booking"
import { BookingPageView } from "@/components/booking/booking-page-view"
import { notFound } from "next/navigation"

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const page = await getActiveBookingPageBySlug(slug)

  if (!page) notFound()

  // Tier comes from organization
  const tier = page.org.tier

  return (
    <BookingPageView
      page={{
        slug: page.slug,
        title: page.title,
        description: page.description,
        duration: page.duration,
        brandColor: tier === "PRO" ? page.brandColor : null,
        logoUrl: tier === "PRO" ? page.logoUrl : null,
      }}
    />
  )
}
