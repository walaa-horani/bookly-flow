import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const page = await prisma.bookingPage.findUnique({ where: { id } })

  if (!page || page.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { title, slug, description, duration, price } = await req.json()

  const updated = await prisma.bookingPage.update({
    where: { id },
    data: { title, slug, description, duration, price: price ?? null },
  })

  return NextResponse.json(updated)
}
