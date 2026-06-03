// lib/data/membership.ts
import { prisma } from "@/lib/prisma"
import type { Membership, Role } from "@/app/generated/prisma/client"

export async function listMembers(orgId: string) {
  return prisma.membership.findMany({
    where: { orgId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  })
}

export async function getMembership(userId: string, orgId: string): Promise<Membership | null> {
  return prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  })
}

export async function countOwners(orgId: string): Promise<number> {
  return prisma.membership.count({ where: { orgId, role: "OWNER" } })
}

export async function updateMemberRole(
  memberId: string,
  orgId: string,
  role: Role
): Promise<Membership> {
  return prisma.membership.update({
    where: { id: memberId, orgId },
    data: { role },
  })
}

export async function removeMember(memberId: string, orgId: string): Promise<void> {
  await prisma.membership.delete({ where: { id: memberId, orgId } })
}

export async function joinByToken(
  token: string,
  userId: string
): Promise<{ orgId: string; alreadyMember: boolean }> {
  const org = await prisma.organization.findUnique({ where: { inviteToken: token } })
  if (!org) throw new Error("INVALID_TOKEN")

  const existing = await prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId: org.id } },
  })
  if (existing) {
    await prisma.user.update({ where: { id: userId }, data: { activeOrgId: org.id } })
    return { orgId: org.id, alreadyMember: true }
  }

  await prisma.$transaction([
    prisma.membership.create({ data: { userId, orgId: org.id, role: "MEMBER" } }),
    prisma.user.update({ where: { id: userId }, data: { activeOrgId: org.id } }),
  ])
  return { orgId: org.id, alreadyMember: false }
}

export async function switchActiveOrg(userId: string, orgId: string): Promise<void> {
  // re-verify membership before writing (TOCTOU guard)
  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  })
  if (!membership) throw new Error("NOT_A_MEMBER")
  await prisma.user.update({ where: { id: userId }, data: { activeOrgId: orgId } })
}

export async function getUserMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { org: { select: { id: true, name: true, tier: true } } },
    orderBy: { createdAt: "asc" },
  })
}

export async function getMembershipById(id: string, orgId: string): Promise<Membership | null> {
  return prisma.membership.findUnique({
    where: { id, orgId },
  })
}
