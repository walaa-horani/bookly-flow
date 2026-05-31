import { describe, it, expect } from "vitest"
import { generateSlots } from "@/lib/slots"

describe("generateSlots", () => {
  it("generates correct slots for a 30-min window", () => {
    const slots = generateSlots({
      date: new Date("2026-06-01T00:00:00.000Z"),
      availability: { startTime: "09:00", endTime: "10:00", dayOfWeek: 1, isActive: true },
      durationMinutes: 30,
      existingAppointments: [],
    })

    expect(slots).toHaveLength(2)
    expect(slots[0].start.getUTCHours()).toBe(9)
    expect(slots[0].start.getUTCMinutes()).toBe(0)
    expect(slots[1].start.getUTCHours()).toBe(9)
    expect(slots[1].start.getUTCMinutes()).toBe(30)
  })

  it("excludes slots overlapping existing appointments", () => {
    const date = new Date("2026-06-01T00:00:00.000Z")
    const existingStart = new Date("2026-06-01T09:00:00.000Z")
    const existingEnd = new Date("2026-06-01T09:30:00.000Z")

    const slots = generateSlots({
      date,
      availability: { startTime: "09:00", endTime: "10:00", dayOfWeek: 1, isActive: true },
      durationMinutes: 30,
      existingAppointments: [{ startTime: existingStart, endTime: existingEnd }],
    })

    expect(slots).toHaveLength(1)
    expect(slots[0].start.getUTCHours()).toBe(9)
    expect(slots[0].start.getUTCMinutes()).toBe(30)
  })

  it("returns empty array when isActive is false", () => {
    const slots = generateSlots({
      date: new Date("2026-06-01T00:00:00.000Z"),
      availability: { startTime: "09:00", endTime: "17:00", dayOfWeek: 1, isActive: false },
      durationMinutes: 30,
      existingAppointments: [],
    })
    expect(slots).toHaveLength(0)
  })
})
