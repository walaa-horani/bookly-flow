// app/(dashboard)/layout.tsx
import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FcmSetup } from "@/components/notifications/fcm-setup"
import { getUserMemberships } from "@/lib/data/membership"
import { OrgSwitcher } from "@/components/dashboard/org-switcher"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const memberships = session.user.activeOrgId
    ? await getUserMemberships(session.user.id)
    : []

  const activeOrg = memberships.find((m) => m.orgId === session.user.activeOrgId)?.org ?? null

  return (
    <>
      <FcmSetup />
      <div className="flex min-h-screen flex-col">
        <header className="border-b bg-background px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-semibold text-lg">
              BooklyFlow
            </Link>
            {memberships.length > 1 ? (
              <OrgSwitcher
                memberships={memberships.map((m) => ({ id: m.orgId, name: m.org.name }))}
                activeOrgId={session.user.activeOrgId ?? ""}
              />
            ) : activeOrg ? (
              <span className="text-sm text-muted-foreground border rounded px-2 py-0.5">
                {activeOrg.name}
              </span>
            ) : null}
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Overview</Link>
            <Link href="/booking-page" className="text-muted-foreground hover:text-foreground">Booking Page</Link>
            <Link href="/availability" className="text-muted-foreground hover:text-foreground">Availability</Link>
            <Link href="/appointments" className="text-muted-foreground hover:text-foreground">Appointments</Link>
            <Link href="/org/settings" className="text-muted-foreground hover:text-foreground">Settings</Link>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
              <Button variant="ghost" size="sm" type="submit">Sign out</Button>
            </form>
          </nav>
        </header>
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">{children}</main>
      </div>
    </>
  )
}
