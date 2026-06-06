import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { token } = await req.json()
  if (!token || typeof token !== "string" || token.length < 10 || token.length > 500) {
    return NextResponse.json({ error: "Token required" }, { status: 400 })
  }

  const ua = req.headers.get("user-agent") ?? undefined

  await prisma.fcmToken.upsert({
    where: { token },
    update: { userId: session.user.id, userAgent: ua },
    create: { userId: session.user.id, token, userAgent: ua },
  })

  return NextResponse.json({ ok: true })
}
