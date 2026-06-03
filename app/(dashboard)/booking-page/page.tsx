// app/(dashboard)/booking-page/page.tsx
import { requireOrgContext } from "@/lib/org-context"
import { getBookingPage } from "@/lib/data/booking-page"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function BookingPageDashboard() {
  const ctx = await requireOrgContext()
  const page = await getBookingPage(ctx.orgId)

  if (!page) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Booking Page</h1>
        <p className="text-muted-foreground">No booking page set up yet.</p>
        <Link href="/booking-page/edit" className={buttonVariants({ variant: "default" })}>
          Create Booking Page
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Booking Page</h1>
        <Link href="/booking-page/edit" className={buttonVariants({ variant: "outline" })}>
          Edit
        </Link>
      </div>
      <Card className="max-w-lg">
        <CardHeader><CardTitle>{page.title}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="font-medium">URL:</span> /book/{page.slug}</p>
          <p><span className="font-medium">Duration:</span> {page.duration} min</p>
          <p><span className="font-medium">Price:</span> {page.price ? `$${page.price} USD` : "Free"}</p>
          {page.description && <p><span className="font-medium">Description:</span> {page.description}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
