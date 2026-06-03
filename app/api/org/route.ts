// app/api/org/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createOrg } from "@/lib/data/org"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name } = await req.json()
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Organization name is required." }, { status: 400 })
  }

  const org = await createOrg(name.trim(), session.user.id)
  return NextResponse.json(org, { status: 201 })
}
