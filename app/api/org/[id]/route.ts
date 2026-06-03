// app/api/org/[id]/route.ts
import { NextResponse } from "next/server"
import { requireOwner } from "@/lib/org-context"
import { updateOrgName, deleteOrg } from "@/lib/data/org"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOwner()
  const { id } = await params
  if (ctx.orgId !== id) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required." }, { status: 400 })

  const org = await updateOrgName(id, name.trim())
  return NextResponse.json(org)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOwner()
  const { id } = await params
  if (ctx.orgId !== id) return NextResponse.json({ error: "Not found." }, { status: 404 })

  await deleteOrg(id)
  return NextResponse.json({ ok: true })
}
