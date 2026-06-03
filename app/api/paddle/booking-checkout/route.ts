// app/api/paddle/booking-checkout/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { paddle } from "@/lib/paddle"

async function getOrCreateCustomer(email: string, name: string): Promise<string> {
  try {
    const customers = paddle.customers.list({ email: [email] })
    const list = await customers.next()
    if (list && list.length > 0) {
      return list[0].id
    }
  } catch (e) {
    console.error("Failed to list customers by email:", e)
  }

  const customer = await paddle.customers.create({ email, name })
  return customer.id
}

export async function POST(req: Request) {
  const { appointmentId } = await req.json()

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      bookingPage: {
        select: { price: true, currency: true, title: true, slug: true, orgId: true },
      },
    },
  })

  if (!appointment || !appointment.bookingPage.price) {
    return NextResponse.json({ error: "Invalid appointment." }, { status: 400 })
  }

  if (appointment.status !== "PENDING") {
    return NextResponse.json({ error: "Appointment is not pending payment." }, { status: 409 })
  }

  const priceInCents = Math.round(Number(appointment.bookingPage.price) * 100)

  try {
    const customerId = await getOrCreateCustomer(appointment.clientEmail, appointment.clientName)

    const transaction = await paddle.transactions.create({
      items: [
        {
          price: {
            description: `${appointment.bookingPage.title} session`,
            unitPrice: { amount: String(priceInCents), currencyCode: appointment.bookingPage.currency as "USD" | "GBP" | "EUR" },
            taxMode: "external",
            product: { name: appointment.bookingPage.title, taxCategory: "digital-goods" },
          },
          quantity: 1,
        },
      ],
      customData: { appointmentId: appointment.id, type: "booking_payment" },
      customerId,
    })
    return NextResponse.json({ checkoutUrl: transaction.checkout?.url ?? null })
  } catch (err) {
    console.error("Paddle booking-checkout failed:", err)
    const message = err instanceof Error ? err.message : "Failed to create checkout."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
