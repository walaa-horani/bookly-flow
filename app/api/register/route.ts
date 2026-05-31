import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/hash"

export async function POST(req: Request) {
  const { name, email, password } = await req.json()

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Email and password (min 8 chars) are required." },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already registered." }, { status: 409 })
  }

  const hashed = await hashPassword(password)
  const user = await prisma.user.create({
    data: { name: name ?? null, email, password: hashed },
    select: { id: true, email: true, name: true },
  })

  return NextResponse.json(user, { status: 201 })
}
