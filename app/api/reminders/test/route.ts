// Manual test: sends a reminder email for a specific appointment (or the next
// upcoming CONFIRMED one if no appointmentId given). Requires a logged-in session.
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendReminderEmail } from "@/lib/email"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const appointmentId: string | undefined = body.appointmentId

  const appointment = appointmentId
    ? await prisma.appointment.findUnique({
        where: {
          id: appointmentId,
          bookingPage: { org: { memberships: { some: { userId: session.user.id } } } },
        },
        include: { bookingPage: { select: { slug: true, title: true, orgId: true } } },
      })
    : await prisma.appointment.findFirst({
        where: {
          // accept any status so a test always finds something regardless of
          // whether the appointment was created before the CONFIRMED fix
          status: { in: ["CONFIRMED", "PENDING"] },
          bookingPage: { org: { memberships: { some: { userId: session.user.id } } } },
        },
        orderBy: { startTime: "asc" },
        include: { bookingPage: { select: { slug: true, title: true, orgId: true } } },
      })

  if (!appointment) {
    return NextResponse.json({ error: "No appointment found." }, { status: 404 })
  }

  console.log(`[reminders/test] found appointment ${appointment.id} status=${appointment.status} startTime=${appointment.startTime} sending to ${session.user.email}`)

  // Send to the provider's own email so the test works without a verified domain.
  const sendTo = session.user.email!

  try {
    await sendReminderEmail({
      to: sendTo,
      clientName: appointment.clientName,
      providerName: appointment.bookingPage.title,
      startTime: appointment.startTime,
      bookingPageSlug: appointment.bookingPage.slug,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send."
    console.error("[reminders/test]", err)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  return NextResponse.json({
    sent: true,
    appointmentId: appointment.id,
    to: sendTo,
  })
}
