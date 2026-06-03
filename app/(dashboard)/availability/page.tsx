// app/(dashboard)/availability/page.tsx
import { requireOrgContext } from "@/lib/org-context"
import { getBookingPageWithAvailability } from "@/lib/data/booking-page"
import { AvailabilityForm } from "@/components/dashboard/availability-form"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"

export default async function AvailabilityPage() {
  const ctx = await requireOrgContext()
  const page = await getBookingPageWithAvailability(ctx.orgId)

  if (!page) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Availability</h1>
        <p className="text-muted-foreground">Create a booking page first.</p>
        <Link href="/booking-page/edit" className={buttonVariants({ variant: "default" })}>
          Create Booking Page
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Availability</h1>
      <AvailabilityForm existing={page.availability} />
    </div>
  )
}
