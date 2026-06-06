"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Slot = {
  start: string
  end: string
}

type Props = {
  slots: Slot[]
  selected: Slot | null
  onSelect: (slot: Slot) => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function TimeSlotPicker({ slots, selected, onSelect }: Props) {
  if (slots.length === 0) {
    return <p className="text-sm text-muted-foreground">No available slots for this day.</p>
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((slot) => {
        const isSelected = selected?.start === slot.start
        return (
          <Button
            key={slot.start}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            className={cn("text-sm", isSelected && "ring-2 ring-offset-2 ring-primary")}
            onClick={() => onSelect(slot)}
          >
            {formatTime(slot.start)}
          </Button>
        )
      })}
    </div>
  )
}
