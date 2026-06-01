import { describe, it, expect } from "vitest"

describe("paddle singleton guard", () => {
  it("throws if PADDLE_API_KEY is not set", async () => {
    const original = process.env.PADDLE_API_KEY
    delete process.env.PADDLE_API_KEY

    await expect(
      Promise.resolve().then(() => {
        if (!process.env.PADDLE_API_KEY) {
          throw new Error("PADDLE_API_KEY is not set")
        }
      })
    ).rejects.toThrow("PADDLE_API_KEY is not set")

    process.env.PADDLE_API_KEY = original
  })
})
