import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AvailabilityForm } from "@/components/dashboard/availability-form"

export default async function AvailabilityPage() {
  const session = await auth()

  const bookingPage = await prisma.bookingPage.findUnique({
    where: { userId: session!.user.id },
    include: { availability: true },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Availability</h1>
      {!bookingPage ? (
        <p className="text-muted-foreground">Create a booking page first.</p>
      ) : (
        <AvailabilityForm existing={bookingPage.availability} />
      )}
    </div>
  )
}
