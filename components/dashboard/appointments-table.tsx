"use client"

import { useState } from "react"
import type { Appointment } from "@/app/generated/prisma/client"

type Props = {
  appointments: Appointment[]
}

export function AppointmentsTable({ appointments }: Props) {
  const [list] = useState(appointments)

  if (list.length === 0) {
    return (
      <div className="text-center py-12 border border-border-light rounded-xl bg-surface-container-low/40">
        <p className="text-sm text-neutral-gray">No appointments yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-border-light rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface border-b border-border-light">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-neutral-gray uppercase">Client</th>
              <th className="px-6 py-3 text-xs font-semibold text-neutral-gray uppercase">Date &amp; Time</th>
              <th className="px-6 py-3 text-xs font-semibold text-neutral-gray uppercase">Status</th>
              <th className="px-6 py-3 text-xs font-semibold text-neutral-gray uppercase">Amount</th>
              <th className="px-6 py-3 text-xs font-semibold text-neutral-gray uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {list.map((appt) => {
              const initials = appt.clientName.substring(0, 2).toUpperCase()
              return (
                <tr key={appt.id} className="hover:bg-surface-container-low/40 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-primary text-xs shrink-0">
                        {initials}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-text-primary leading-tight">{appt.clientName}</div>
                        <div className="text-xs text-neutral-gray mt-0.5">{appt.clientEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">
                        {new Date(appt.startTime).toLocaleDateString("en", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-xs text-neutral-gray mt-0.5">
                        {new Date(appt.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        —{" "}
                        {new Date(appt.endTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      appt.status === "CONFIRMED"
                        ? "bg-success/10 text-success border border-success/20"
                        : appt.status === "PENDING"
                        ? "bg-warning/10 text-warning border border-warning/20"
                        : appt.status === "CANCELLED"
                        ? "bg-error/10 text-error border border-error/20"
                        : "bg-neutral-gray/10 text-neutral-gray border border-neutral-gray/20"
                    }`}>
                      {appt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-text-primary">
                    {appt.amountPaid ? `$${appt.amountPaid}` : "Free"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="material-symbols-outlined p-2 text-neutral-gray opacity-0 group-hover:opacity-100 hover:bg-surface rounded-full transition-all border-none bg-transparent cursor-pointer">
                      more_vert
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
