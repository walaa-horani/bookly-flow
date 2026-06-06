"use client"

import { useFcm } from "@/hooks/use-fcm"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"

export function FcmSetup() {
  const { registerToken } = useFcm()
  const [permission, setPermission] = useState<string>("default")
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission)
      if (Notification.permission === "default") {
        setShow(true)
      } else if (Notification.permission === "granted") {
        // Automatically ensure token is updated if already granted
        registerToken()
      }
    }
  }, [registerToken])

  if (!show || permission !== "default") return null

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between mb-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-primary/20 p-2 rounded-full text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Enable push notifications</h3>
          <p className="text-xs text-muted-foreground">
            Get notified instantly when clients book appointments with you.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={async () => {
          await registerToken()
          setPermission(Notification.permission)
          setShow(false)
        }}
      >
        Enable Notifications
      </Button>
    </div>
  )
}
