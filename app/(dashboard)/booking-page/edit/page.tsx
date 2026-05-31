import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BookingPageForm } from "@/components/dashboard/booking-page-form"

export default async function EditBookingPage() {
  const session = await auth()
  const existing = await prisma.bookingPage.findUnique({
    where: { userId: session!.user.id },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {existing ? "Edit Booking Page" : "Create Booking Page"}
      </h1>
      <BookingPageForm existing={existing} />
    </div>
  )
}
