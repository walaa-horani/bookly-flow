// app/api/org/switch/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { switchActiveOrg } from "@/lib/data/membership"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgId } = await req.json()
  if (!orgId) return NextResponse.json({ error: "orgId required." }, { status: 400 })

  try {
    await switchActiveOrg(session.user.id, orgId)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "You are not a member of that organization." }, { status: 403 })
  }
}
