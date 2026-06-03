// app/api/org/[id]/invite/route.ts
import { NextResponse } from "next/server"
import { requireOwner } from "@/lib/org-context"
import { rotateInviteToken } from "@/lib/data/org"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOwner()
  const { id } = await params
  if (ctx.orgId !== id) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const token = await rotateInviteToken(id)
  return NextResponse.json({ inviteToken: token })
}
