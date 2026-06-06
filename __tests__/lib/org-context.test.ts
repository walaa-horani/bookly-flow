// __tests__/lib/org-context.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockAuth, mockFindUnique, mockFindFirst, mockUpdate, mockRedirect } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUnique: vi.fn(),
  mockFindFirst: vi.fn(),
  mockUpdate: vi.fn(),
  mockRedirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

vi.mock("@/lib/auth", () => ({ auth: mockAuth }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: { findUnique: mockFindUnique, findFirst: mockFindFirst },
    user: { update: mockUpdate },
  },
}))
vi.mock("next/navigation", () => ({ redirect: mockRedirect }))

const { requireOrgContext } = await import("@/lib/org-context")

const SESSION_PROVIDER = {
  user: { id: "u1", activeOrgId: "org1", accountType: "PROVIDER" },
}
const MEMBERSHIP = {
  orgId: "org1",
  role: "OWNER",
  org: { id: "org1", name: "Acme", tier: "FREE", inviteToken: "tok" },
}

beforeEach(() => vi.clearAllMocks())

describe("requireOrgContext", () => {
  it("redirects to /login when no session", async () => {
    mockAuth.mockResolvedValue(null)
    await expect(requireOrgContext()).rejects.toThrow("REDIRECT:/login")
  })

  it("redirects to / when accountType is CLIENT", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", activeOrgId: "org1", accountType: "CLIENT" },
    })
    await expect(requireOrgContext()).rejects.toThrow("REDIRECT:/")
  })

  it("redirects to /onboarding when no activeOrgId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", activeOrgId: null, accountType: "PROVIDER" },
    })
    await expect(requireOrgContext()).rejects.toThrow("REDIRECT:/onboarding")
  })

  it("returns org context for valid member", async () => {
    mockAuth.mockResolvedValue(SESSION_PROVIDER)
    mockFindUnique.mockResolvedValue(MEMBERSHIP)
    const ctx = await requireOrgContext()
    expect(ctx).toEqual({
      userId: "u1",
      orgId: "org1",
      role: "OWNER",
      org: MEMBERSHIP.org,
    })
  })

  it("clears activeOrgId and redirects /onboarding when membership gone and no other orgs", async () => {
    mockAuth.mockResolvedValue(SESSION_PROVIDER)
    mockFindUnique.mockResolvedValue(null)
    mockFindFirst.mockResolvedValue(null)
    await expect(requireOrgContext()).rejects.toThrow("REDIRECT:/onboarding?reason=removed")
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { activeOrgId: null },
    })
  })

  it("auto-switches to another org when removed from current", async () => {
    mockAuth.mockResolvedValue(SESSION_PROVIDER)
    mockFindUnique.mockResolvedValue(null)
    mockFindFirst.mockResolvedValue({
      orgId: "org2",
      role: "MEMBER",
      org: { id: "org2", name: "Other", tier: "FREE", inviteToken: "tok2" },
    })
    const ctx = await requireOrgContext()
    expect(ctx.orgId).toBe("org2")
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { activeOrgId: "org2" },
    })
  })
})
