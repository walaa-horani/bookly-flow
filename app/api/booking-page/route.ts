// app/api/booking-page/route.ts
import { NextResponse } from "next/server"
import { requireOrgContext } from "@/lib/org-context"
import { createBookingPage } from "@/lib/data/booking-page"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const ctx = await requireOrgContext()
  const { title, slug, description, duration, price } = await req.json()

  const existing = await prisma.bookingPage.findUnique({ where: { slug } })
  if (existing) return NextResponse.json({ error: "Slug already taken." }, { status: 409 })

  const page = await createBookingPage(ctx.orgId, {
    title,
    slug,
    description: description ?? null,
    duration: duration ?? 30,
    price: price ?? null,
  })

  return NextResponse.json(page, { status: 201 })
}
