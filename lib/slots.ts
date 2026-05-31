type AvailabilityInput = {
  startTime: string
  endTime: string
  dayOfWeek: number
  isActive: boolean
}

type AppointmentInput = {
  startTime: Date
  endTime: Date
}

type SlotInput = {
  date: Date
  availability: AvailabilityInput
  durationMinutes: number
  existingAppointments: AppointmentInput[]
}

export type TimeSlot = {
  start: Date
  end: Date
}

function parseTime(date: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number)
  const result = new Date(date)
  result.setUTCHours(h, m, 0, 0)
  return result
}

function overlaps(slotStart: Date, slotEnd: Date, appt: AppointmentInput): boolean {
  return slotStart < appt.endTime && slotEnd > appt.startTime
}

export function generateSlots({
  date,
  availability,
  durationMinutes,
  existingAppointments,
}: SlotInput): TimeSlot[] {
  if (!availability.isActive) return []

  const slots: TimeSlot[] = []
  const windowStart = parseTime(date, availability.startTime)
  const windowEnd = parseTime(date, availability.endTime)
  const durationMs = durationMinutes * 60 * 1000

  let cursor = windowStart.getTime()

  while (cursor + durationMs <= windowEnd.getTime()) {
    const start = new Date(cursor)
    const end = new Date(cursor + durationMs)

    const blocked = existingAppointments.some((a) => overlaps(start, end, a))
    if (!blocked) {
      slots.push({ start, end })
    }

    cursor += durationMs
  }

  return slots
}
