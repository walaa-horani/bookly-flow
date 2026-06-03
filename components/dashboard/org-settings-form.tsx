// components/dashboard/org-settings-form.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Member = { id: string; userId: string; role: string; name: string | null; email: string }

export function OrgSettingsForm({
  org,
  members,
  currentUserId,
}: {
  org: { id: string; name: string; inviteToken: string }
  members: Member[]
  currentUserId: string
}) {
  const router = useRouter()
  const [name, setName] = useState(org.name)
  const [inviteToken, setInviteToken] = useState(org.inviteToken)
  const [saving, setSaving] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${inviteToken}`
      : `/join/${inviteToken}`

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/org/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Failed to save.")
    } else {
      router.refresh()
    }
  }

  async function handleRotate() {
    setRotating(true)
    const res = await fetch(`/api/org/${org.id}/invite`, { method: "POST" })
    setRotating(false)
    if (res.ok) {
      const d = await res.json()
      setInviteToken(d.inviteToken)
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this member?")) return
    await fetch(`/api/org/${org.id}/members/${memberId}`, { method: "DELETE" })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Organization name</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleRename} className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </form>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invite link</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <code className="block text-xs bg-muted rounded p-2 break-all">{inviteUrl}</code>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(inviteUrl)}>
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleRotate} disabled={rotating}>
              {rotating ? "Rotating…" : "Rotate (revokes old link)"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Members</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <span>{m.name ?? m.email} <span className="text-muted-foreground">({m.email})</span></span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground capitalize">{m.role.toLowerCase()}</span>
                  {m.userId !== currentUserId && (
                    <Button variant="ghost" size="sm" onClick={() => handleRemove(m.id)}>
                      Remove
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
