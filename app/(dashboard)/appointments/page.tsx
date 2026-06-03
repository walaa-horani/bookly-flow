// app/(dashboard)/appointments/page.tsx
import { requireOrgContext } from "@/lib/org-context"
import { listOrgAppointments } from "@/lib/data/appointments"
import { AppointmentsTable } from "@/components/dashboard/appointments-table"

export default async function AppointmentsPage() {
  const ctx = await requireOrgContext()
  const appointments = await listOrgAppointments(ctx.orgId)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Appointments</h1>
      {appointments.length === 0 ? (
        <p className="text-muted-foreground">No appointments yet.</p>
      ) : (
        <AppointmentsTable appointments={appointments} />
      )}
    </div>
  )
}
