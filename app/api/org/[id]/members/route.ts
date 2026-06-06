// app/api/org/[id]/members/route.ts
import { NextResponse } from "next/server"
import { requireOrgContext } from "@/lib/org-context"
import { listMembers } from "@/lib/data/membership"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext()
  const { id } = await params
  if (ctx.orgId !== id) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const members = await listMembers(id)
  return NextResponse.json(members)
}
