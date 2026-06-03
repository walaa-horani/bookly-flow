// __tests__/isolation/cross-org.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { getBookingPage, updateBookingPage } from "@/lib/data/booking-page"
import { listOrgAppointments } from "@/lib/data/appointments"
import { getMembership } from "@/lib/data/membership"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bookingPage: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    appointment: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  }
}))

const mockBookingPage = vi.mocked(prisma.bookingPage)
const mockAppointment = vi.mocked(prisma.appointment)
const mockMembership = vi.mocked(prisma.membership)

const ORG_A = "org_A"
const ORG_B = "org_B"
const PAGE_B_ID = "page_B"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("cross-org isolation — data layer", () => {
  it("getBookingPage uses orgId in where clause — can never return another org's page", async () => {
    mockBookingPage.findUnique.mockResolvedValue(null)
    const result = await getBookingPage(ORG_A)
    expect(mockBookingPage.findUnique).toHaveBeenCalledWith({
      where: { orgId: ORG_A },
    })
    expect(result).toBeNull()
  })

  it("updateBookingPage uses compound { id, orgId } — foreign page id returns nothing", async () => {
    mockBookingPage.update.mockResolvedValue(null)
    // Org A member passes Org B's page id — compound where prevents match
    await updateBookingPage(ORG_A, PAGE_B_ID, {
      title: "Hack",
      slug: "hack",
      duration: 30,
    })
    expect(mockBookingPage.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PAGE_B_ID, orgId: ORG_A } })
    )
  })

  it("listOrgAppointments resolves bookingPageId via orgId — never fetches another org's appointments", async () => {
    // Org A has a page, Org B has a different page
    mockBookingPage.findUnique.mockResolvedValue({ id: "page_A" } as any)
    mockAppointment.findMany.mockResolvedValue([])
    await listOrgAppointments(ORG_A)
    expect(mockBookingPage.findUnique).toHaveBeenCalledWith({
      where: { orgId: ORG_A },
      select: { id: true },
    })
    expect(mockAppointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { bookingPageId: "page_A" } })
    )
  })

  it("getMembership requires both userId AND orgId — cannot probe another org", async () => {
    mockMembership.findUnique.mockResolvedValue(null)
    await getMembership("user_1", ORG_B)
    expect(mockMembership.findUnique).toHaveBeenCalledWith({
      where: { userId_orgId: { userId: "user_1", orgId: ORG_B } },
    })
  })
})
