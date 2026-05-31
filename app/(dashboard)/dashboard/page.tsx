import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user.id

  const bookingPage = await prisma.bookingPage.findUnique({
    where: { userId },
    include: { _count: { select: { appointments: true } } },
  })

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const todayCount = bookingPage
    ? await prisma.appointment.count({
        where: {
          bookingPageId: bookingPage.id,
          startTime: { gte: todayStart, lte: todayEnd },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      })
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session!.user.name ?? session!.user.email}
          </p>
        </div>
        <Badge variant={session!.user.tier === "PRO" ? "default" : "secondary"}>
          {session!.user.tier}
        </Badge>
      </div>

      {!bookingPage ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">
              You haven&apos;t created a booking page yet.
            </p>
            <Button asChild>
              <Link href="/dashboard/booking-page/edit">Create Booking Page</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today&apos;s Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{todayCount}</p>
              {session!.user.tier === "FREE" && (
                <p className="text-xs text-muted-foreground mt-1">of 5 daily limit</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{bookingPage._count.appointments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Booking Page
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium truncate">/book/{bookingPage.slug}</p>
              <Button variant="link" className="p-0 h-auto text-xs" asChild>
                <Link href={`/book/${bookingPage.slug}`} target="_blank">
                  View →
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
