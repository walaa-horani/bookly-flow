"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import type { Availability } from "@/app/generated/prisma/client"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

type DaySlot = {
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

type Props = {
  existing: Availability[]
}

function buildInitial(existing: Availability[]): DaySlot[] {
  return DAYS.map((_, i) => {
    const found = existing.find((a) => a.dayOfWeek === i)
    return {
      dayOfWeek: i,
      startTime: found?.startTime ?? "09:00",
      endTime: found?.endTime ?? "17:00",
      isActive: found?.isActive ?? (i >= 1 && i <= 5),
    }
  })
}

export function AvailabilityForm({ existing }: Props) {
  const [slots, setSlots] = useState<DaySlot[]>(() => buildInitial(existing))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function update(index: number, patch: Partial<DaySlot>) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slots),
    })
    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="space-y-3 max-w-lg">
      {slots.map((slot, i) => (
        <Card key={i}>
          <CardContent className="pt-4 flex items-center gap-4">
            <Switch
              checked={slot.isActive}
              onCheckedChange={(v) => update(i, { isActive: v })}
            />
            <span className="w-24 text-sm font-medium">{DAYS[i]}</span>
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="time"
                value={slot.startTime}
                onChange={(e) => update(i, { startTime: e.target.value })}
                disabled={!slot.isActive}
                className="w-32"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="time"
                value={slot.endTime}
                onChange={(e) => update(i, { endTime: e.target.value })}
                disabled={!slot.isActive}
                className="w-32"
              />
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Availability"}
        </Button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
      </div>
    </div>
  )
}
