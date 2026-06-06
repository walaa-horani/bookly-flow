import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/hash"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_ACCOUNT_TYPES = ["PROVIDER", "CLIENT"] as const

export async function POST(req: Request) {
  const { name, email, password, accountType } = await req.json()

  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 })
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Email and password (min 8 chars) are required." },
      { status: 400 }
    )
  }
  if (name && (typeof name !== "string" || name.length > 200)) {
    return NextResponse.json({ error: "Name must be under 200 characters." }, { status: 400 })
  }

  const resolvedAccountType =
    VALID_ACCOUNT_TYPES.includes(accountType) ? accountType : "PROVIDER"

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already registered." }, { status: 409 })
  }

  const hashed = await hashPassword(password)
  const user = await prisma.user.create({
    data: { name: name ?? null, email, password: hashed, accountType: resolvedAccountType },
    select: { id: true, email: true, name: true, accountType: true },
  })

  return NextResponse.json(user, { status: 201 })
}
