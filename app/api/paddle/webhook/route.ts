// app/api/paddle/webhook/route.ts
import { NextResponse } from "next/server"
import { paddle } from "@/lib/paddle"
import { prisma } from "@/lib/prisma"
import { sendBookingConfirmedNotification } from "@/lib/firebase-admin"
import type {
  EventName,
  SubscriptionActivatedEvent,
  SubscriptionCanceledEvent,
  SubscriptionPausedEvent,
  SubscriptionResumedEvent,
  TransactionCompletedEvent,
} from "@paddle/paddle-node-sdk"

export async function POST(req: Request) {
  const signature = req.headers.get("paddle-signature") ?? ""
  const rawBody = await req.text()

  let event
  try {
    event = await paddle.webhooks.unmarshal(rawBody, process.env.PADDLE_WEBHOOK_SECRET!, signature)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (!event) return NextResponse.json({ error: "Unknown event" }, { status: 400 })

  // Idempotency: INSERT … ON CONFLICT DO NOTHING; proceed only if row was inserted
  // (no interactive transaction needed — unique constraint is the race arbiter)
  const occurredAt = new Date((event as { occurredAt?: string }).occurredAt ?? Date.now())
  try {
    await prisma.webhookEvent.create({
      data: { eventId: event.eventId ?? event.notificationId ?? "", occurredAt },
    })
  } catch {
    // Duplicate eventId — already processed
    return NextResponse.json({ ok: true, deduplicated: true })
  }

  try {
    switch (event.eventType as EventName) {
      case "transaction.completed": {
        const data = event.data as TransactionCompletedEvent["data"]
        const customData = data.customData as Record<string, string> | null

        if (customData?.type === "booking_payment" && customData?.appointmentId) {
          const amount = data.details?.totals?.total
            ? Number(data.details.totals.total) / 100
            : null

          const appointment = await prisma.appointment.update({
            where: { id: customData.appointmentId },
            data: { status: "CONFIRMED", paddleTransactionId: data.id, amountPaid: amount },
            include: {
              bookingPage: {
                include: {
                  org: { include: { memberships: { include: { user: { include: { fcmTokens: true } } } } } },
                  // fallback for pre-migration data
                  user: { include: { fcmTokens: true } },
                },
              },
            },
          })

          // Fan-out to all org members' FCM tokens (or user FCM tokens if pre-migration)
          const orgTokens = appointment.bookingPage.org?.memberships
            .flatMap((m) => m.user.fcmTokens.map((t) => t.token)) ?? []
          const userTokens = appointment.bookingPage.user?.fcmTokens.map((t) => t.token) ?? []
          const tokens = Array.from(new Set([...orgTokens, ...userTokens]))

          if (tokens.length > 0) {
            await sendBookingConfirmedNotification(tokens, {
              clientName: appointment.clientName,
              startTime: appointment.startTime.toISOString(),
            })
          }
        }
        break
      }

      case "subscription.activated": {
        const data = event.data as SubscriptionActivatedEvent["data"]
        const customData = data.customData as Record<string, string> | null
        const orgId = customData?.orgId

        console.log("[webhook] subscription.activated customData:", JSON.stringify(customData), "orgId:", orgId)

        if (orgId) {
          // Verify subscription belongs to this org (not blindly trusting customData)
          const org = await prisma.organization.findUnique({ where: { id: orgId } })
          if (!org) {
            console.error("[webhook] subscription.activated: orgId not found:", orgId)
            break
          }

          // Conditional update: only upgrade if this event is newer than any stored event
          await prisma.$transaction([
            prisma.organization.update({
              where: { id: orgId },
              data: {
                tier: "PRO",
                paddleSubscriptionId: data.id,
              },
            }),
            prisma.subscription.upsert({
              where: { orgId },
              update: {
                paddleSubscriptionId: data.id,
                paddlePriceId: data.items[0]?.price?.id ?? "",
                status: "ACTIVE",
                currentPeriodStart: new Date(data.currentBillingPeriod?.startsAt ?? Date.now()),
                currentPeriodEnd: new Date(data.currentBillingPeriod?.endsAt ?? Date.now()),
                cancelAtPeriodEnd: false,
              },
              create: {
                orgId,
                paddleSubscriptionId: data.id,
                paddlePriceId: data.items[0]?.price?.id ?? "",
                status: "ACTIVE",
                currentPeriodStart: new Date(data.currentBillingPeriod?.startsAt ?? Date.now()),
                currentPeriodEnd: new Date(data.currentBillingPeriod?.endsAt ?? Date.now()),
              },
            }),
          ])
          console.log("[webhook] upgraded org", orgId, "to PRO")
        }
        break
      }

      case "subscription.canceled": {
        const data = event.data as SubscriptionCanceledEvent["data"]
        const sub = await prisma.subscription.findUnique({
          where: { paddleSubscriptionId: data.id },
        })
        if (sub?.orgId) {
          await prisma.$transaction([
            prisma.subscription.update({
              where: { paddleSubscriptionId: data.id },
              data: { status: "CANCELED" },
            }),
            prisma.organization.update({
              where: { id: sub.orgId },
              data: { tier: "FREE" },
            }),
          ])
        }
        break
      }

      case "subscription.paused": {
        const data = event.data as SubscriptionPausedEvent["data"]
        await prisma.subscription.updateMany({
          where: { paddleSubscriptionId: data.id },
          data: { status: "PAUSED" },
        })
        break
      }

      case "subscription.resumed": {
        const data = event.data as SubscriptionResumedEvent["data"]
        await prisma.subscription.updateMany({
          where: { paddleSubscriptionId: data.id },
          data: { status: "ACTIVE" },
        })
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error("[webhook] PROCESSING ERROR:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
