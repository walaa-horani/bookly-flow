import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-semibold text-lg">
          BooklyFlow
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            Overview
          </Link>
          <Link href="/dashboard/booking-page" className="text-muted-foreground hover:text-foreground">
            Booking Page
          </Link>
          <Link href="/dashboard/availability" className="text-muted-foreground hover:text-foreground">
            Availability
          </Link>
          <Link href="/dashboard/appointments" className="text-muted-foreground hover:text-foreground">
            Appointments
          </Link>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </nav>
      </header>
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">{children}</main>
    </div>
  )
}
