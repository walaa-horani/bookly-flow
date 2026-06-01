"use client"

import { useFcm } from "@/hooks/use-fcm"

export function FcmSetup() {
  useFcm()
  return null
}
