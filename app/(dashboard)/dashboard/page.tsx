// app/(dashboard)/dashboard/page.tsx
import { auth } from "@/lib/auth"
import { requireOrgContext } from "@/lib/org-context"
import { getBookingPageWithCount } from "@/lib/data/booking-page"
import { countTodayAppointments, listOrgAppointments } from "@/lib/data/appointments"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { UpgradeButton } from "@/components/dashboard/upgrade-button"
import { CopyButton } from "@/components/ui/copy-button"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ joined?: string; already?: string; error?: string }>
}) {
  const [ctx, session] = await Promise.all([requireOrgContext(), auth()])

  const bookingPage = await getBookingPageWithCount(ctx.orgId)

  const todayCount = bookingPage
    ? await countTodayAppointments(bookingPage.id, new Date())
    : 0

  const recentAppointments = await listOrgAppointments(ctx.orgId, 3)

  const resolvedSearchParams = await searchParams
  const joinedOrg = resolvedSearchParams?.joined
  const alreadyMember = resolvedSearchParams?.already === "1"

  return (
    <div className="space-y-8 pb-12">
      {/* Alerts */}
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

      {/* Hero Branding Section */}
      <div className="w-full aspect-[3.42] overflow-hidden rounded-xl border border-border-light relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          alt="Dashboard Banner" 
          className="w-full h-full object-cover" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdoEANYtKyLSSfK0ZO5tIijPrqSVKlmoTiD2QfjmyDYDgdQdmdgH_wytxkhLn5l4LfCVNwo35jGtategmFiSzV2-NWmVHUDJrkF1fMTCvP2KKmrUu6tVYVu055FpHjlJyXl6H6P3bhC-Cwsip5z9WzhhsuTb5AWTYKNFhb0XS1sDdCQ5-duAfGJlHzslnW3zk6lQO-PijReTQG288Kay1HUGafMJzaNzbCVB4rx8wrCvdLG5G4SacGmvluYl43WO-knNk_KiE-k9fC"
        />
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      {/* Header section with actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">Creator Dashboard</h1>
            <Badge variant={ctx.org.tier === "PRO" ? "default" : "secondary"} className="bg-primary hover:bg-primary text-white">
              {ctx.org.tier}
            </Badge>
          </div>
          <p className="text-sm text-neutral-gray">Manage performance and scheduling for <span className="font-semibold text-text-primary">{ctx.org.name}</span></p>
        </div>
        <div className="flex items-center gap-3">
          {ctx.org.tier === "FREE" && ctx.role === "OWNER" && (
            <UpgradeButton orgId={ctx.orgId} email={session?.user.email ?? ""} />
          )}
          <Link href="/appointments" className="bg-surface text-text-primary px-4 py-2 rounded-full font-medium text-xs flex items-center gap-2 hover:bg-surface-container transition-all border border-border-light">
            <span className="material-symbols-outlined text-[16px]">analytics</span>
            View Calendar
          </Link>
          {!bookingPage ? (
            <Link href="/booking-page/edit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-full font-medium text-xs flex items-center gap-2 transition-all">
              <span className="material-symbols-outlined text-[16px]">add</span>
              Create Page
            </Link>
          ) : (
            <Link href="/booking-page/edit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-full font-medium text-xs flex items-center gap-2 transition-all">
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Edit Page
            </Link>
          )}
        </div>
      </div>

      {/* Bento Stats Layout */}
      {!bookingPage ? (
        <Card className="border-border-light bg-surface-container-low">
          <CardContent className="pt-6 text-center py-12">
            <p className="text-neutral-gray mb-4">No booking page yet. Let customers schedule with you by creating a page.</p>
            <Link href="/booking-page/edit" className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-full font-medium text-sm inline-flex items-center gap-2 transition-all">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create Booking Page
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Today's Bookings Card */}
          <div className="p-6 border border-border-light rounded-xl flex flex-col justify-between hover:bg-surface transition-colors cursor-pointer group bg-background">
            <div>
              <div className="flex justify-between items-start mb-6">
                <span className="text-xs font-semibold text-neutral-gray uppercase tracking-wider">Today&apos;s Bookings</span>
                <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
              </div>
              <div className="font-heading text-4xl font-black text-text-primary mb-1">{todayCount}</div>
              {ctx.org.tier === "FREE" ? (
                <div className="text-[11px] text-neutral-gray">
                  of 5 daily limit
                </div>
              ) : (
                <div className="flex items-center gap-1 text-success text-[11px] font-bold">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                  <span>Unlimited scheduling</span>
                </div>
              )}
            </div>
            <div className="mt-8 pt-4 border-t border-border-light group-hover:border-primary/20 transition-colors">
              <Link href="/appointments" className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                View schedule <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Total Appointments Card */}
          <div className="p-6 border border-border-light rounded-xl flex flex-col justify-between hover:bg-surface transition-colors cursor-pointer group bg-background">
            <div>
              <div className="flex justify-between items-start mb-6">
                <span className="text-xs font-semibold text-neutral-gray uppercase tracking-wider">Total Appointments</span>
                <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
              </div>
              <div className="font-heading text-4xl font-black text-text-primary mb-1">{bookingPage._count.appointments}</div>
              <div className="flex items-center gap-1 text-success text-[11px] font-bold">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>Active booking page</span>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-border-light group-hover:border-primary/20 transition-colors">
              <Link href="/appointments" className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                Full report <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Booking Page Link Card */}
          <div className="p-6 border border-border-light rounded-xl flex flex-col justify-between bg-surface-container-low border-dashed border-2">
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-semibold text-neutral-gray uppercase tracking-wider">Booking Page Link</span>
                <span className="material-symbols-outlined text-primary text-[20px]">link</span>
              </div>
              <p className="text-xs text-neutral-gray mb-3 leading-normal">Share this link to let clients book slots directly.</p>
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-border-light">
                <input 
                  className="flex-1 bg-transparent border-none text-[11px] font-mono outline-none text-text-primary truncate px-1 animate-none" 
                  readOnly 
                  type="text" 
                  value={`/book/${bookingPage.slug}`}
                />
                <CopyButton text={`/book/${bookingPage.slug}`} label="Copy" className="bg-primary hover:bg-primary-hover text-white text-[10px] h-7 px-3 rounded" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link href={`/book/${bookingPage.slug}`} target="_blank" className="p-2 bg-white rounded-lg border border-border-light hover:bg-surface transition-colors flex items-center justify-center" title="Preview page">
                <span className="material-symbols-outlined text-neutral-gray text-[18px]">open_in_new</span>
              </Link>
              <Link href="/booking-page" className="p-2 bg-white rounded-lg border border-border-light hover:bg-surface transition-colors flex items-center justify-center" title="Manage booking">
                <span className="material-symbols-outlined text-neutral-gray text-[18px]">settings</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-heading text-lg font-bold text-text-primary">Recent Bookings</h2>
          <Link href="/appointments" className="text-primary hover:underline text-xs font-bold flex items-center gap-1">
            See all activity
          </Link>
        </div>
        
        <div className="bg-white border border-border-light rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface border-b border-border-light">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-neutral-gray uppercase">Client</th>
                  <th className="px-6 py-3 text-xs font-semibold text-neutral-gray uppercase">Service / Page</th>
                  <th className="px-6 py-3 text-xs font-semibold text-neutral-gray uppercase">Date &amp; Time</th>
                  <th className="px-6 py-3 text-xs font-semibold text-neutral-gray uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {recentAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-neutral-gray">
                      No recent appointments found.
                    </td>
                  </tr>
                ) : (
                  recentAppointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-primary text-xs">
                            {appt.clientName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-text-primary">{appt.clientName}</div>
                            <div className="text-xs text-neutral-gray">{appt.clientEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-primary">
                        {bookingPage?.title || "1:1 Session"}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-primary">
                        {new Date(appt.startTime).toLocaleDateString()} at{" "}
                        {new Date(appt.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          appt.status === "CONFIRMED" 
                            ? "bg-success/10 text-success border border-success/20" 
                            : appt.status === "PENDING"
                            ? "bg-warning/10 text-warning border border-warning/20"
                            : "bg-neutral-gray/10 text-neutral-gray border border-neutral-gray/20"
                        }`}>
                          {appt.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Content Grid Sample */}
      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-4">Your Latest Content</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="flex flex-col gap-3 group cursor-pointer">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                alt="Workstation"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhaJ17KIzwGeIB0VjFFn2-xMbyzIFcG_t0om_0tUpuf18lttE1NCh7IzICPtenbp45L-TnH-33DI2rHdah70Or8xgLwef-kRwU6s2hUOYZDHBwxFV_DEhzfXRYE3WKSDPftWQszZkO74_CEY5AtoL_cozYO8v5uzuOIOd2jt03gaZga-R28hCKdWfH0S2wQWV13TQ0HthGOl96Srhx8RETXQmdPs39WRACnxaOlAA5HE1yIplnqh2Ma_Pho3QtyewLJTRus8MMIX8o"
              />
              <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-semibold px-1.5 rounded-sm">12:45</span>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-surface shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Channel logo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBMAKncYIBUs5EXg8cV7VElrhZ-erx21jxMrPr2yjz8DdrXauTn6CXld0E-UBiKruKMPC6Ne-4H8rYkoHvAwAMWffijEjJh8mQxXxEPEDCPoIsGK73poWpLVix0AWh68TewSwBCVwIkf2r5EBFc1rqxGMi9WDs8vWJZSbRSF4EZR4dikEHe1SgKzIPXvMTIBghc0kO6rTYVlz_xnaq8cel0s3_FDbzxxEz1eC3HKw5ncfvIu-vFkMg7Vv0z_sTMO8bY6XtZf8BhwuSE" />
              </div>
              <div className="flex flex-col gap-0.5">
                <h3 className="text-xs font-semibold text-text-primary line-clamp-2 leading-tight">How to build a high-performance creator dashboard in 2024</h3>
                <div className="text-[10px] text-neutral-gray mt-0.5">
                  <p className="hover:text-text-primary font-medium">StreamTube Creator</p>
                  <p>125K views • 2 days ago</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col gap-3 group cursor-pointer">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                alt="Dashboard screen"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaYQnFhcC0hrsmvVBG5cAY7w6avY1NtSsZkWkJkkF4wx9KKL_T9T70mXwhAF2k2ICyoLEyG6R6XCD7K-LYLLrA-XN35Rx4_R5hh1pD8qi4nuAqvzCBJjoqxusA6CTqOwtWcgughGL48E5fE5-vTvnFRiqRH4mQfzmhPDe62o3BQXOnmbHBiXz7QuIKfMHP_gOlbAH62xmVejnQH1FRNMqevGiM58NEjlNfZRvkolYRUC3O87nx7C5GXge80dl4IbX6APrTwFWs28ro"
              />
              <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-semibold px-1.5 rounded-sm">08:22</span>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-surface shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Channel logo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDIKG1njAaTJO0NV0VTZwvsmdT16l3zV974ORYGx9CpuDaDrZxCqv3ur9MIpKcYnrKUjSNkjIbL0qFjPRcwutp84s60xCELvm3gaWdJOkkB0cVk1ZszeCcg2_T7Zs5czJm3lIN7GwArVNLwD7ue-fA5rFBun6hr7oBQL5NOkMuYmbNU5pudc7thU2qYYUmVKyYddNfi8lccSJpBMD1lZX1vx-Ia7oe2TOs-g8yuvN81paahNa8_XLVRV7PyJlYPTr7RMmeuEo2rQtMt" />
              </div>
              <div className="flex flex-col gap-0.5">
                <h3 className="text-xs font-semibold text-text-primary line-clamp-2 leading-tight">Top 5 Scheduling Tools Every Creator Needs</h3>
                <div className="text-[10px] text-neutral-gray mt-0.5">
                  <p className="hover:text-text-primary font-medium">StreamTube Creator</p>
                  <p>42K views • 1 week ago</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col gap-3 group cursor-pointer">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                alt="Typing on keyboard"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBa7FJfahxOe0wSucX6aH8wne96NavKO0QHXLXJ-r_PjZ_VuMA9IjbPmIAYkMkvQh6bq49-l4BFvx8CkZ5IQK4XfdsBM0e6qpHBbP0NWLXov8fLU6IitvWV_vIR30bsVBzSOVvarH8JwIQ1sFhfxXjvNbXlxlvQWmeGyqMIV6Tgj2ndmA4v9SMDMO2S00hkAjwfTS6wIb-4tezBpWbHx5pTqP_7dw-KFFPpoV70_C4GdxBLF1Zzj9tEO60mzOftKg7hioXO51awVN65"
              />
              <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-semibold px-1.5 rounded-sm">15:10</span>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-surface shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Channel logo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDp2gChNPQ2hOSYDmm4ae5lGN_cE_X2HeeuT3R073dYHrk6MpSgdfBqMslaWhcjNghNijXqQiFbSERAAd3QH4fNoLqpxx5x3nkdxoF-OvLGjNrHBA2By7FpbYsIJ-anhyxUr8mTaLqbO_H5MF6i-GLv8s-xUSEsY2-_r9DCppBk67tcbAUj3z-6NvFEGxF-eeGy3SOi92NOfXzpFrTLr4U34Mm2C19RohU6rkS4YbSnkC-asxfOHi8ZG7E4auyEkixCJqK04BWShsdV" />
              </div>
              <div className="flex flex-col gap-0.5">
                <h3 className="text-xs font-semibold text-text-primary line-clamp-2 leading-tight">Scaling your subscriber base through private sessions</h3>
                <div className="text-[10px] text-neutral-gray mt-0.5">
                  <p className="hover:text-text-primary font-medium">StreamTube Creator</p>
                  <p>89K views • 3 days ago</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="flex flex-col gap-3 group cursor-pointer">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                alt="Meeting room"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvin7KTm0-KaKRB39Qs-7EvKUyleeh7hfppbuAAd5sKXRK9jN4zYZgPN4avbkGEY6bTlHPu-Di3dPfSgMDNBQ2wqM7L-CO5fCKav_E17-Rg1v31Dq47zfeI_JiSJuvkRHHUWxNMH_toG1TO7iKUWkaNtPPEu4BI4pAwEwWRsPVsVLKknbTGtrvBf-yb9l_-arMAO04huchnJkvK2dLVSgxPVFeY5_Fhf0MaSvaUJBN7fxEsbgg2JvEzuCMx4fRwF2G6ugg02iKtteL"
              />
              <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-semibold px-1.5 rounded-sm">21:05</span>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-surface shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Channel logo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBGV5lCMraHPHIRmlMIlaUv9GCEcYuIVz30emmdegeDfLRbuXGMOfi73cPf3b_oVqdGhrt_we3ugbH-DrQ9dNy066rFqNuphHCFmEGWO1stn4dnomNnS5noPrSQ-XhZVWoU-l9St4LmhzTi0U0Raf9jZUSgLvJStVhwqBvWfF0tYF3XKP8QBZ4HwsXJVrkZafNwzhzLGdgcmAyeu0zes15_CVlpBk628ORZcsl-IAfGeZvTUDuhKyQZyOtSkZ381DEotYRwyQpTX-pV" />
              </div>
              <div className="flex flex-col gap-0.5">
                <h3 className="text-xs font-semibold text-text-primary line-clamp-2 leading-tight">Monetization Strategies for 2025: Beyond AdSense</h3>
                <div className="text-[10px] text-neutral-gray mt-0.5">
                  <p className="hover:text-text-primary font-medium">StreamTube Creator</p>
                  <p>210K views • 5 days ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
