import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { paddle } from "@/lib/paddle"

export async function POST(req: Request) {
  const { appointmentId } = await req.json()

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      bookingPage: {
        select: { price: true, currency: true, title: true, slug: true },
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

  const transaction = await paddle.transactions.create({
    items: [
      {
        price: {
          description: `${appointment.bookingPage.title} session`,
          unitPrice: {
            amount: String(priceInCents),
            currencyCode: appointment.bookingPage.currency as "USD" | "GBP" | "EUR",
          },
          taxMode: "exclusive",
          product: {
            name: appointment.bookingPage.title,
            taxCategory: "digital-goods",
          },
        },
        quantity: 1,
      },
    ],
    customData: {
      appointmentId: appointment.id,
      type: "booking_payment",
    },
    customer: {
      email: appointment.clientEmail,
      name: appointment.clientName,
    },
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/book/${appointment.bookingPage.slug}/confirmed?appt=${appointment.id}`,
  })

  return NextResponse.json({ checkoutUrl: transaction.checkout?.url ?? null })
}
