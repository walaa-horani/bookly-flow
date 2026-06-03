// lib/data/org.ts
import { prisma } from "@/lib/prisma"
import type { Organization } from "@/app/generated/prisma/client"

export async function createOrg(name: string, ownerId: string): Promise<Organization> {
  const org = await prisma.organization.create({ data: { name } })
  await prisma.membership.create({ data: { userId: ownerId, orgId: org.id, role: "OWNER" } })
  await prisma.user.update({ where: { id: ownerId }, data: { activeOrgId: org.id } })
  return org
}

export async function getOrg(orgId: string): Promise<Organization | null> {
  return prisma.organization.findUnique({ where: { id: orgId } })
}

export async function updateOrgName(orgId: string, name: string): Promise<Organization> {
  return prisma.organization.update({ where: { id: orgId }, data: { name } })
}

export async function rotateInviteToken(orgId: string): Promise<string> {
  const { inviteToken } = await prisma.organization.update({
    where: { id: orgId },
    data: { inviteToken: crypto.randomUUID() },
    select: { inviteToken: true },
  })
  return inviteToken
}

export async function deleteOrg(orgId: string): Promise<void> {
  // cascade deletes memberships, bookingPage, subscription via schema onDelete
  await prisma.organization.delete({ where: { id: orgId } })
}

export async function getOrgByInviteToken(token: string): Promise<Organization | null> {
  return prisma.organization.findUnique({ where: { inviteToken: token } })
}
