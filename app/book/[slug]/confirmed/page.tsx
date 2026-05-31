import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function BookingConfirmed({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ appt?: string }>
}) {
  const { appt } = await searchParams

  const appointment = appt
    ? await prisma.appointment.findUnique({
        where: { id: appt },
        select: { clientName: true, startTime: true, status: true },
      })
    : null

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-green-600">Booking Confirmed!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {appointment ? (
            <>
              <p>Hi {appointment.clientName},</p>
              <p className="text-muted-foreground">
                Your appointment on{" "}
                {new Date(appointment.startTime).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}{" "}
                at{" "}
                {new Date(appointment.startTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                is confirmed.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Your booking has been received.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
