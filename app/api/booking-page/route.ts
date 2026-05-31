import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { title, slug, description, duration, price } = await req.json()

  const existing = await prisma.bookingPage.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: "Slug already taken." }, { status: 409 })
  }

  const page = await prisma.bookingPage.create({
    data: {
      userId: session.user.id,
      title,
      slug,
      description: description ?? null,
      duration: duration ?? 30,
      price: price ?? null,
    },
  })

  return NextResponse.json(page, { status: 201 })
}
