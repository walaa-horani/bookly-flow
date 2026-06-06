import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendNewBookingNotification } from "@/lib/firebase-admin"

// Sends a test push to the signed-in user's own registered devices.
// Used by the dashboard "Send test notification" button to verify the
// provider's FCM token is registered and the browser is showing pushes.
export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await prisma.fcmToken.findMany({
    where: { userId: session.user.id },
    select: { token: true },
  })
  const tokens = rows.map((r) => r.token)

  if (tokens.length === 0) {
    return NextResponse.json({ tokenCount: 0 })
  }

  try {
    await sendNewBookingNotification(tokens, {
      clientName: "Test booking",
      startTime: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[fcm/test] send failed:", err)
    const message = err instanceof Error ? err.message : "Failed to send."
    return NextResponse.json({ error: message }, { status: 502 })
  }

  return NextResponse.json({ tokenCount: tokens.length })
}
