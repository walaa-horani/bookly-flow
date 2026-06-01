import * as admin from "firebase-admin"

const requiredEnvVars = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]

for (const key of requiredEnvVars) {
  if (!process.env[key]) throw new Error(`Missing env: ${key}`)
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  })
}

export const fcmAdmin = admin.messaging()

export async function sendBookingConfirmedNotification(
  tokens: string[],
  data: { clientName: string; startTime: string }
) {
  if (tokens.length === 0) return

  const date = new Date(data.startTime)
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const dateStr = date.toLocaleDateString()

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: "New Booking Confirmed!",
      body: `${data.clientName} booked at ${timeStr} on ${dateStr}`,
    },
    webpush: {
      notification: {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
      },
      fcmOptions: {
        link: "/dashboard/appointments",
      },
    },
  }

  const response = await fcmAdmin.sendEachForMulticast(message)

  response.responses.forEach((r, i) => {
    if (!r.success) {
      console.error(`FCM failed for token[${i}]:`, r.error?.message)
    }
  })
}
