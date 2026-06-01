import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { paddle } from "@/lib/paddle"

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (session.user.tier === "PRO") {
    return NextResponse.json({ error: "Already on Pro." }, { status: 400 })
  }

  const transaction = await paddle.transactions.create({
    items: [
      {
        priceId: process.env.PADDLE_PRO_PRICE_ID!,
        quantity: 1,
      },
    ],
    customData: {
      userId: session.user.id,
      type: "subscription_upgrade",
    },
    customer: {
      email: session.user.email!,
    },
  })

  return NextResponse.json({ checkoutUrl: transaction.checkout?.url ?? null })
}
