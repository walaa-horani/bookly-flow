// app/(dashboard)/appointments/page.tsx
import { requireOrgContext } from "@/lib/org-context"
import { listOrgAppointments } from "@/lib/data/appointments"
import { AppointmentsTable } from "@/components/dashboard/appointments-table"

export default async function AppointmentsPage() {
  const ctx = await requireOrgContext()
  const appointments = await listOrgAppointments(ctx.orgId)

  // Compute stats dynamically from the actual DB records
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const todayMeetingsCount = appointments.filter((appt) => {
    const d = new Date(appt.startTime)
    return d >= todayStart && d <= todayEnd
  }).length

  const totalRevenue = appointments
    .filter((appt) => appt.status === "CONFIRMED" && appt.amountPaid)
    .reduce((sum, appt) => sum + Number(appt.amountPaid), 0)

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Summary Section */}
      <div className="relative w-full h-[220px] rounded-xl overflow-hidden mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          alt="Schedule header" 
          className="w-full h-full object-cover" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXDnZ7N7TFXV5YG_Kb2TQCd6WBGceffoEr4g7LSCAjQnhazTHLhi81Oey1I9aMQZ6I2ZhJ19tLSGrkJBf7lIL9FIGW82aqpgjnBV1zz8Cgqdal26xYn4m7s3Fu5hP8vINamVZJN7qGeAnMDrlYEGLuJJJXGediwYnf-yyDL23L92qCW39dk8EBOieLynToMxgm0SDLvX0QJhmo5KY_23R3DLBuVVbzXJgJgada5vxBg3uCoZTL6Uz9oBnqoKR6yDbWC1l3ion-hrne"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex flex-col justify-center px-6 md:px-12 text-white">
          <h1 className="font-heading text-2xl md:text-3xl font-black mb-1">Appointment Dashboard</h1>
          <p className="text-xs opacity-90 max-w-[500px] leading-relaxed mb-4">
            Review, manage, and confirm your upcoming client consultations. Efficiently track your session history and earnings at a glance.
          </p>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20">
              <span className="text-[9px] uppercase tracking-widest block opacity-70">Today</span>
              <span className="font-bold text-sm md:text-base">{todayMeetingsCount} {todayMeetingsCount === 1 ? "Meeting" : "Meetings"}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20">
              <span className="text-[9px] uppercase tracking-widest block opacity-70">Confirmed Revenue</span>
              <span className="font-bold text-sm md:text-base">${totalRevenue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar & Chips */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button className="px-4 py-1.5 bg-text-primary text-white font-medium text-xs rounded-full">All</button>
          <button className="px-4 py-1.5 bg-surface text-text-primary font-medium text-xs rounded-full hover:bg-surface-container transition-colors">Upcoming</button>
          <button className="px-4 py-1.5 bg-surface text-text-primary font-medium text-xs rounded-full hover:bg-surface-container transition-colors">Confirmed</button>
          <button className="px-4 py-1.5 bg-surface text-text-primary font-medium text-xs rounded-full hover:bg-surface-container transition-colors">Pending</button>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-surface rounded-lg transition-colors font-medium text-xs text-text-primary">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            <span>Filter</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-surface rounded-lg transition-colors font-medium text-xs text-text-primary">
            <span className="material-symbols-outlined text-[18px]">sort</span>
            <span>Sort by Date</span>
          </button>
        </div>
      </div>

      {/* Appointments List Section */}
      {appointments.length === 0 ? (
        <div className="text-center py-12 border border-border-light rounded-xl bg-surface-container-low/40">
          <p className="text-sm text-neutral-gray">No appointments yet.</p>
        </div>
      ) : (
        <AppointmentsTable appointments={appointments} />
      )}
    </div>
  )
}
