import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppointmentsTable } from "@/components/dashboard/appointments-table"

export default async function AppointmentsPage() {
  const session = await auth()

  const bookingPage = await prisma.bookingPage.findUnique({
    where: { userId: session!.user.id },
    include: {
      appointments: {
        orderBy: { startTime: "desc" },
        take: 100,
      },
    },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Appointments</h1>
      {!bookingPage ? (
        <p className="text-muted-foreground">Create a booking page first.</p>
      ) : (
        <AppointmentsTable appointments={bookingPage.appointments} />
      )}
    </div>
  )
}
