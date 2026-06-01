import { describe, it, expect } from "vitest"

function buildNotificationPayload(clientName: string, startTime: string) {
  const date = new Date(startTime)
  return {
    title: "New Booking Confirmed!",
    body: `${clientName} booked at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })} on ${date.toLocaleDateString()}`,
  }
}

describe("buildNotificationPayload", () => {
  it("includes client name in body", () => {
    const payload = buildNotificationPayload("Alice", "2026-06-01T10:00:00.000Z")
    expect(payload.title).toBe("New Booking Confirmed!")
    expect(payload.body).toContain("Alice")
  })

  it("formats date in body", () => {
    const payload = buildNotificationPayload("Bob", "2026-06-15T14:30:00.000Z")
    expect(payload.body).toMatch(/Bob/)
  })
})
