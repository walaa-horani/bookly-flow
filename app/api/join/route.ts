// app/api/join/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { joinByToken } from "@/lib/data/membership"
import { getOrgByInviteToken } from "@/lib/data/org"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: "Token required." }, { status: 400 })

  // Peek at the org name for the response before joining
  const org = await getOrgByInviteToken(token)
  if (!org) {
    return NextResponse.json(
      { error: "This invite link is no longer active — ask the owner for a new one." },
      { status: 404 }
    )
  }

  const result = await joinByToken(token, session.user.id)
  return NextResponse.json({
    orgId: result.orgId,
    orgName: org.name,
    alreadyMember: result.alreadyMember,
  })
}
