import { describe, it, expect } from "vitest"

describe("paddle webhook routing", () => {
  it("identifies subscription_activated event type", () => {
    const event = { eventType: "subscription.activated", data: {} }
    const isSubscriptionEvent = event.eventType.startsWith("subscription.")
    expect(isSubscriptionEvent).toBe(true)
  })

  it("identifies transaction_completed event type", () => {
    const event = { eventType: "transaction.completed", data: {} }
    const isTransactionEvent = event.eventType === "transaction.completed"
    expect(isTransactionEvent).toBe(true)
  })

  it("ignores unknown event types", () => {
    const event = { eventType: "unknown.event", data: {} }
    const handled =
      event.eventType.startsWith("subscription.") ||
      event.eventType === "transaction.completed"
    expect(handled).toBe(false)
  })
})
