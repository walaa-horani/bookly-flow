import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function BookingPageDashboard() {
  const session = await auth()
  const page = await prisma.bookingPage.findUnique({
    where: { userId: session!.user.id },
  })

  if (!page) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Booking Page</h1>
        <p className="text-muted-foreground">You haven&apos;t set up your booking page yet.</p>
        <Button asChild>
          <Link href="/dashboard/booking-page/edit">Create Booking Page</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Booking Page</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/booking-page/edit">Edit</Link>
        </Button>
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{page.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="font-medium">URL:</span> /book/{page.slug}</p>
          <p><span className="font-medium">Duration:</span> {page.duration} min</p>
          <p>
            <span className="font-medium">Price:</span>{" "}
            {page.price ? `$${page.price} USD` : "Free"}
          </p>
          {page.description && (
            <p><span className="font-medium">Description:</span> {page.description}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
