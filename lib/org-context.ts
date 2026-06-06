// lib/org-context.ts
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import type { Role, Tier } from "@/app/generated/prisma/client"

export type OrgContext = {
  userId: string
  orgId: string
  role: Role
  org: { id: string; name: string; tier: Tier; inviteToken: string }
}

/**
 * Authoritative isolation boundary for all dashboard pages and API routes.
 * Treats session.user.activeOrgId as a hint only — re-queries membership live.
 * Never call proxy.ts the security boundary; this is.
 */
export async function requireOrgContext(): Promise<OrgContext> {
  const session = await auth()
  if (!session) redirect("/login")

  if (session.user.accountType !== "PROVIDER") redirect("/")

  const activeOrgId = session.user.activeOrgId
  if (!activeOrgId) redirect("/onboarding")

  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId: activeOrgId } },
    include: { org: { select: { id: true, name: true, tier: true, inviteToken: true } } },
  })

  if (!membership) {
    // Check for other memberships — auto-switch instead of dumping on onboarding
    const other = await prisma.membership.findFirst({
      where: { userId: session.user.id },
      include: { org: { select: { id: true, name: true, tier: true, inviteToken: true } } },
    })
    if (other) {
      await prisma.user.update({ where: { id: session.user.id }, data: { activeOrgId: other.orgId } })
      return { userId: session.user.id, orgId: other.orgId, role: other.role, org: other.org }
    }
    await prisma.user.update({ where: { id: session.user.id }, data: { activeOrgId: null } })
    redirect("/onboarding?reason=removed")
  }

  return { userId: session.user.id, orgId: membership.orgId, role: membership.role, org: membership.org }
}

/** Use for billing, invite management, member removal, org deletion. */
export async function requireOwner(): Promise<OrgContext> {
  const ctx = await requireOrgContext()
  if (ctx.role !== "OWNER") redirect("/dashboard?error=owner_required")
  return ctx
}
