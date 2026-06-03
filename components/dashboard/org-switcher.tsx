// components/dashboard/org-switcher.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function OrgSwitcher({
  memberships,
  activeOrgId,
}: {
  memberships: { id: string; name: string }[]
  activeOrgId: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSwitch(orgId: string) {
    if (orgId === activeOrgId) return
    setLoading(true)
    await fetch("/api/org/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <select
      value={activeOrgId}
      onChange={(e) => handleSwitch(e.target.value)}
      disabled={loading}
      className="text-sm border rounded px-2 py-0.5 bg-background"
      aria-label="Switch organization"
    >
      {memberships.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  )
}
