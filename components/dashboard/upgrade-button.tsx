// components/dashboard/upgrade-button.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { getPaddle } from "@/lib/paddle-client"

export function UpgradeButton({ orgId, email }: { orgId: string; email: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const paddle = await getPaddle()
      if (!paddle) throw new Error("Paddle failed to load.")
      paddle.Checkout.open({
        items: [{ priceId: process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID!, quantity: 1 }],
        customData: { orgId, type: "subscription_upgrade" },
        customer: email ? { email } : undefined,
        settings: { displayMode: "overlay", theme: "light" },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1">
      <Button onClick={handleUpgrade} disabled={loading}>
        {loading ? "Opening…" : "Upgrade to Pro"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
