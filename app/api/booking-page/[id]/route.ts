// app/api/booking-page/[id]/route.ts
import { NextResponse } from "next/server"
import { requireOrgContext } from "@/lib/org-context"
import { updateBookingPage } from "@/lib/data/booking-page"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireOrgContext()
  const { id } = await params
  const { title, slug, description, duration, price } = await req.json()

  try {
    // compound { id, orgId } in updateBookingPage prevents IDOR
    const updated = await updateBookingPage(ctx.orgId, id, {
      title,
      slug,
      description: description ?? null,
      duration,
      price: price ?? null,
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }
}
