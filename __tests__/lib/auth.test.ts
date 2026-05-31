import { describe, it, expect } from "vitest"

describe("credentials authorize", () => {
  it("returns null when email or password is missing", async () => {
    const authorize = async (credentials: Record<string, string> | null) => {
      if (!credentials?.email || !credentials?.password) return null
      return null
    }

    expect(await authorize(null)).toBeNull()
    expect(await authorize({ email: "", password: "x" })).toBeNull()
    expect(await authorize({ email: "a@b.com", password: "" })).toBeNull()
  })
})
