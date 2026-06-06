"use client"

import { useEffect, useCallback } from "react"
import { getToken, onMessage } from "firebase/messaging"
import { getFirebaseMessaging } from "@/lib/firebase-client"

export function useFcm() {
  const registerToken = useCallback(async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") return

      const messaging = getFirebaseMessaging()
      if (!messaging) return

      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
        serviceWorkerRegistration: await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js"
        ),
      })

      if (!token) return

      await fetch("/api/fcm/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      // Foreground messages don't trigger the service worker's
      // onBackgroundMessage, so show them here while the tab is focused.
      onMessage(messaging, (payload) => {
        const { title, body } = payload.notification ?? {}
        if (title && Notification.permission === "granted") {
          new Notification(title, { body: body ?? "", icon: "/favicon.ico" })
        }
        // Signal the notification bell to refetch immediately.
        window.dispatchEvent(new CustomEvent("fcm-message", { detail: payload }))
      })
    } catch (err) {
      console.error("FCM registration failed:", err)
    }
  }, [])

  return { registerToken }
}
