// app/(dashboard)/dashboard/page.tsx
import { requireOrgContext } from "@/lib/org-context"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { UpgradeButton } from "@/components/dashboard/upgrade-button"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ joined?: string; already?: string; error?: string }>
}) {
  const ctx = await requireOrgContext()

  const bookingPage = await prisma.bookingPage.findUnique({
    where: { orgId: ctx.orgId },
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

  const resolvedSearchParams = await searchParams
  const joinedOrg = resolvedSearchParams?.joined
  const alreadyMember = resolvedSearchParams?.already === "1"

  return (
    <div className="space-y-6">
      {joinedOrg && (
        <div className="rounded border bg-green-50 border-green-200 p-3 text-sm text-green-800">
          {alreadyMember
            ? `You're already in ${joinedOrg} — switched you there.`
            : `You joined ${joinedOrg}.`}
        </div>
      )}
      {resolvedSearchParams?.error === "owner_required" && (
        <div className="rounded border bg-amber-50 border-amber-200 p-3 text-sm text-amber-800">
          Only the organization owner can perform that action.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">{ctx.org.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={ctx.org.tier === "PRO" ? "default" : "secondary"}>
            {ctx.org.tier}
          </Badge>
          {ctx.org.tier === "FREE" && ctx.role === "OWNER" && (
            <UpgradeButton orgId={ctx.orgId} email="" />
          )}
          {ctx.org.tier === "FREE" && ctx.role === "MEMBER" && (
            <span className="text-xs text-muted-foreground">
              Ask your owner to upgrade
            </span>
          )}
        </div>
      </div>

      {!bookingPage ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">No booking page yet.</p>
            <Link href="/booking-page/edit" className={buttonVariants({ variant: "default" })}>
              Create Booking Page
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{todayCount}</p>
              {ctx.org.tier === "FREE" && (
                <p className="text-xs text-muted-foreground mt-1">of 5 daily limit</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{bookingPage._count.appointments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Booking Page</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium truncate">/book/{bookingPage.slug}</p>
              <Link href={`/book/${bookingPage.slug}`} target="_blank" className={buttonVariants({ variant: "link", size: "sm" })}>
                View →
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
