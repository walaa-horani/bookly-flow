"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Appointment, AppointmentStatus } from "@/app/generated/prisma/client"

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  CANCELLED: "destructive",
  COMPLETED: "outline",
  NO_SHOW: "destructive",
} as const

type Props = {
  appointments: Appointment[]
}

export function AppointmentsTable({ appointments }: Props) {
  const [list] = useState(appointments)

  if (list.length === 0) {
    return <p className="text-muted-foreground">No appointments yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Date & Time</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((appt) => (
          <TableRow key={appt.id}>
            <TableCell>
              <div>
                <p className="font-medium">{appt.clientName}</p>
                <p className="text-xs text-muted-foreground">{appt.clientEmail}</p>
              </div>
            </TableCell>
            <TableCell>
              {new Date(appt.startTime).toLocaleDateString()}{" "}
              {new Date(appt.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_COLORS[appt.status] as "default" | "secondary" | "destructive" | "outline"}>
                {appt.status}
              </Badge>
            </TableCell>
            <TableCell>
              {appt.amountPaid ? `$${appt.amountPaid}` : "Free"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
