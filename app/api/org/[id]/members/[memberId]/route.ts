import { NextResponse } from "next/server"
import { requireOwner } from "@/lib/org-context"
import { removeMember, updateMemberRole, countOwners, getMembershipById } from "@/lib/data/membership"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const ctx = await requireOwner()
  const { id, memberId } = await params
  if (ctx.orgId !== id) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const target = await getMembershipById(memberId, id)
  if (!target) return NextResponse.json({ error: "Member not found." }, { status: 404 })

  // Last-owner protection
  if (target.role === "OWNER") {
    const ownerCount = await countOwners(id)
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last owner of an organization." },
        { status: 400 }
      )
    }
  }

  await removeMember(memberId, id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const ctx = await requireOwner()
  const { id, memberId } = await params
  if (ctx.orgId !== id) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const { role } = await req.json()
  if (role !== "OWNER" && role !== "MEMBER") {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 })
  }

  // Last-owner protection when demoting
  if (role === "MEMBER") {
    const target = await getMembershipById(memberId, id)
    if (!target) return NextResponse.json({ error: "Member not found." }, { status: 404 })

    if (target.role === "OWNER") {
      const ownerCount = await countOwners(id)
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last owner of an organization." },
          { status: 400 }
        )
      }
    }
  }

  const updated = await updateMemberRole(memberId, id, role)
  return NextResponse.json(updated)
}
