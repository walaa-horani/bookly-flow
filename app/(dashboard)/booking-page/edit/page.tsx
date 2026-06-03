import { requireOrgContext } from "@/lib/org-context"
import { getBookingPage } from "@/lib/data/booking-page"
import { BookingPageForm } from "@/components/dashboard/booking-page-form"

export default async function EditBookingPage() {
  const ctx = await requireOrgContext()
  const existing = await getBookingPage(ctx.orgId)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {existing ? "Edit Booking Page" : "Create Booking Page"}
      </h1>
      <BookingPageForm existing={existing} />
    </div>
  )
}
