// app/(dashboard)/layout.tsx
import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FcmSetup } from "@/components/notifications/fcm-setup"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { getUserMemberships } from "@/lib/data/membership"
import { OrgSwitcher } from "@/components/dashboard/org-switcher"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  if (session.user.accountType !== "PROVIDER") {
    redirect("/")
  }

  const memberships = session.user.activeOrgId
    ? await getUserMemberships(session.user.id)
    : []

  const activeOrg = memberships.find((m) => m.orgId === session.user.activeOrgId)?.org ?? null

  return (
    <div className="flex min-h-screen flex-col font-sans bg-background text-text-primary">
      <FcmSetup />

      {/* TopNavBar */}
      <header className="fixed top-0 w-full h-[56px] z-50 bg-background flex justify-between items-center px-4 md:px-6 border-b border-border-light shadow-sm">
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined p-2 hover:bg-surface rounded-full transition-colors cursor-pointer text-text-primary border-none">
            menu
          </button>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              play_circle
            </span>
            <Link href="/dashboard" className="font-heading text-xl font-black text-primary tracking-tighter hover:opacity-95">
              BooklyFlow
            </Link>
          </div>
          {memberships.length > 1 ? (
            <div className="ml-2">
              <OrgSwitcher
                memberships={memberships.map((m) => ({ id: m.orgId, name: m.org.name }))}
                activeOrgId={session.user.activeOrgId ?? ""}
              />
            </div>
          ) : activeOrg ? (
            <span className="text-xs text-neutral-gray border border-border-light rounded px-2 py-0.5 ml-2 font-medium">
              {activeOrg.name}
            </span>
          ) : null}
        </div>

        {/* Search bar in center */}
        <div className="hidden md:flex flex-1 max-w-[560px] mx-6 items-center">
          <div className="flex flex-1 items-center border border-border-light rounded-l-full overflow-hidden bg-white group focus-within:border-secondary transition-colors h-9">
            <div className="px-3 text-neutral-gray hidden group-focus-within:block">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              className="w-full py-1 px-3 border-none focus:ring-0 text-sm bg-transparent outline-none text-text-primary"
              placeholder="Search appointments, bookings..."
              type="text"
            />
          </div>
          <button className="bg-search-btn-bg border border-l-0 border-border-light px-6 h-9 rounded-r-full hover:bg-surface transition-colors cursor-pointer flex items-center justify-center" title="Search">
            <span className="material-symbols-outlined text-neutral-gray text-[20px]">search</span>
          </button>
        </div>

        {/* Actions / User Profile */}
        <div className="flex items-center gap-2">
          <button className="material-symbols-outlined p-2 hover:bg-surface rounded-full transition-colors cursor-pointer text-text-primary" title="Create">
            video_call
          </button>
          <NotificationBell />

          <div className="flex items-center gap-3 ml-2 pl-2 border-l border-border-light">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-text-primary">{session.user.name ?? session.user.email}</span>
              <span className="text-[10px] text-neutral-gray capitalize">
                {session.user.accountType.toLowerCase()} Account
              </span>
            </div>
            <div className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border border-border-light bg-surface flex items-center justify-center">
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="User profile" className="w-full h-full object-cover" src={session.user.image} />
              ) : (
                <span className="material-symbols-outlined text-neutral-gray text-[20px]">account_circle</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-[56px] pb-[56px] md:pb-0">
        {/* SideNavBar */}
        <aside className="fixed left-0 top-[56px] w-[80px] h-[calc(100vh-56px)] z-40 bg-background flex flex-col pt-4 overflow-y-auto no-scrollbar border-r border-border-light hidden md:flex">
          <div className="px-1.5 mb-4 flex flex-col gap-1 items-center w-full">
            <Link href="/dashboard" className="flex flex-col items-center justify-center w-full py-3 px-1 text-text-primary hover:bg-surface rounded-xl transition-all font-medium gap-1 text-center">
              <span className="material-symbols-outlined text-[22px]">home</span>
              <span className="text-[10px] tracking-tight leading-tight">Overview</span>
            </Link>
            <Link href="/appointments" className="flex flex-col items-center justify-center w-full py-3 px-1 text-text-primary hover:bg-surface rounded-xl transition-all font-medium gap-1 text-center">
              <span className="material-symbols-outlined text-[22px]">calendar_today</span>
              <span className="text-[10px] tracking-tight leading-tight">Appointments</span>
            </Link>
            <Link href="/booking-page" className="flex flex-col items-center justify-center w-full py-3 px-1 text-text-primary hover:bg-surface rounded-xl transition-all font-medium gap-1 text-center">
              <span className="material-symbols-outlined text-[22px]">link</span>
              <span className="text-[10px] tracking-tight leading-tight">Booking Page</span>
            </Link>
            <Link href="/availability" className="flex flex-col items-center justify-center w-full py-3 px-1 text-text-primary hover:bg-surface rounded-xl transition-all font-medium gap-1 text-center">
              <span className="material-symbols-outlined text-[22px]">schedule</span>
              <span className="text-[10px] tracking-tight leading-tight">Availability</span>
            </Link>
            <Link href="/org/settings" className="flex flex-col items-center justify-center w-full py-3 px-1 text-text-primary hover:bg-surface rounded-xl transition-all font-medium gap-1 text-center">
              <span className="material-symbols-outlined text-[22px]">settings</span>
              <span className="text-[10px] tracking-tight leading-tight">Settings</span>
            </Link>
          </div>

          <hr className="border-t border-border-light mx-2 mb-4" />

          <div className="mt-auto p-1.5 mb-4 w-full">
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
              <Button variant="ghost" className="w-full flex flex-col items-center justify-center text-neutral-gray hover:text-primary hover:bg-surface rounded-xl py-3 px-1 text-[10px] gap-1 h-auto font-medium text-center" type="submit">
                <span className="material-symbols-outlined text-[22px]">logout</span>
                <span className="leading-tight text-[10px]">Sign out</span>
              </Button>
            </form>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 md:ml-[80px] p-6 max-w-[1200px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-[56px] bg-background border-t border-border-light flex justify-around items-center z-50">
        <Link href="/dashboard" className="flex flex-col items-center justify-center text-text-primary">
          <span className="material-symbols-outlined text-[22px]">home</span>
          <span className="text-[10px] font-medium mt-0.5">Overview</span>
        </Link>
        <Link href="/appointments" className="flex flex-col items-center justify-center text-neutral-gray hover:text-text-primary">
          <span className="material-symbols-outlined text-[22px]">calendar_today</span>
          <span className="text-[10px] font-medium mt-0.5">Appts</span>
        </Link>
        <Link href="/booking-page" className="flex flex-col items-center justify-center text-neutral-gray hover:text-text-primary">
          <span className="material-symbols-outlined text-[22px]">link</span>
          <span className="text-[10px] font-medium mt-0.5">Booking</span>
        </Link>
        <Link href="/org/settings" className="flex flex-col items-center justify-center text-neutral-gray hover:text-text-primary">
          <span className="material-symbols-outlined text-[22px]">settings</span>
          <span className="text-[10px] font-medium mt-0.5">Settings</span>
        </Link>
      </nav>
    </div>
  )
}
