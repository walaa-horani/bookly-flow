import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendConfirmationEmail({
  to,
  clientName,
  providerName,
  startTime,
  bookingPageSlug,
}: {
  to: string
  clientName: string
  providerName: string
  startTime: Date
  bookingPageSlug: string
}) {
  const dateStr = startTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  const timeStr = startTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "BooklyFlow <noreply@booklyflow.com>",
    to,
    subject: `Your booking is confirmed — ${providerName} on ${dateStr}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="margin-bottom:8px">Booking Confirmed</h2>
        <p>Hi ${clientName},</p>
        <p>Your appointment has been confirmed:</p>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0"><strong>${providerName}</strong></p>
          <p style="margin:4px 0;color:#6b7280">${dateStr}</p>
          <p style="margin:4px 0;color:#6b7280">${timeStr}</p>
        </div>
        <p>We look forward to seeing you!</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          Powered by <a href="${appUrl}/book/${bookingPageSlug}" style="color:#9ca3af">BooklyFlow</a>
        </p>
      </div>
    `,
  })

  if (error) throw new Error(error.message)
}

export async function sendReminderEmail({
  to,
  clientName,
  providerName,
  startTime,
  bookingPageSlug,
}: {
  to: string
  clientName: string
  providerName: string
  startTime: Date
  bookingPageSlug: string
}) {
  const dateStr = startTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  const timeStr = startTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "BooklyFlow <noreply@booklyflow.com>",
    to,
    subject: `Reminder: Your appointment tomorrow at ${timeStr}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="margin-bottom:8px">Appointment Reminder</h2>
        <p>Hi ${clientName},</p>
        <p>This is a reminder that you have an appointment scheduled for <strong>tomorrow</strong>:</p>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0"><strong>${providerName}</strong></p>
          <p style="margin:4px 0;color:#6b7280">${dateStr}</p>
          <p style="margin:4px 0;color:#6b7280">${timeStr}</p>
        </div>
        <p>We look forward to seeing you!</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          Powered by <a href="${appUrl}/book/${bookingPageSlug}" style="color:#9ca3af">BooklyFlow</a>
        </p>
      </div>
    `,
  })

  if (error) throw new Error(error.message)
}
