import { describe, it, expect } from "vitest"
import { prisma } from "@/lib/prisma"

describe("prisma singleton", () => {
  it("returns the same PrismaClient instance on repeated imports", async () => {
    const { prisma: prisma2 } = await import("@/lib/prisma")
    expect(prisma).toBe(prisma2)
  })
})
