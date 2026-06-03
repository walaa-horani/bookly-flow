// app/(dashboard)/onboarding/page.tsx
"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const resolvedSearchParams = use(searchParams)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const reason = resolvedSearchParams?.reason
  const banner =
    reason === "removed" ? "You no longer have access to that organization." : null

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    const res = await fetch("/api/org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.")
      return
    }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Get started with BooklyFlow</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your booking page and team live in an organization.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {banner && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
              {banner} Create a new organization or open an invite link.
            </p>
          )}
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label htmlFor="org-name" className="text-sm font-medium">
                Organization name
              </label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Clinic"
                autoFocus
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating…" : "Create organization"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center">
            Got an invite link? Just open it in your browser.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
