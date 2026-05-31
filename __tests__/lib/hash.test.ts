import { describe, it, expect } from "vitest"
import { hashPassword, verifyPassword } from "@/lib/hash"

describe("hashPassword", () => {
  it("produces a bcrypt hash different from the original", async () => {
    const hash = await hashPassword("mysecret")
    expect(hash).not.toBe("mysecret")
    expect(hash).toMatch(/^\$2[aby]\$/)
  })
})

describe("verifyPassword", () => {
  it("returns true for correct password", async () => {
    const hash = await hashPassword("correct")
    expect(await verifyPassword("correct", hash)).toBe(true)
  })

  it("returns false for wrong password", async () => {
    const hash = await hashPassword("correct")
    expect(await verifyPassword("wrong", hash)).toBe(false)
  })
})
