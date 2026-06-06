import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const orgId = session.user.activeOrgId
  if (!orgId) return NextResponse.json({ notifications: [], unreadCount: 0 })

  const [notifications, unreadCount] = await Promise.all([
    prisma.orgNotification.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.orgNotification.count({
      where: { orgId, read: false },
    }),
  ])

  return NextResponse.json({ notifications, unreadCount })
}

export async function PATCH() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const orgId = session.user.activeOrgId
  if (!orgId) return NextResponse.json({ ok: true })

  await prisma.orgNotification.updateMany({
    where: { orgId, read: false },
    data: { read: true },
  })

  return NextResponse.json({ ok: true })
}
