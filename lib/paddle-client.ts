"use client"

import { initializePaddle, type Paddle } from "@paddle/paddle-js"

let paddlePromise: Promise<Paddle | undefined> | null = null

/**
 * Lazily initialize Paddle.js (client-side). Returns a cached promise so the
 * script is only loaded once per page. Uses the public client-side token —
 * NOT the secret API key.
 */
export function getPaddle(): Promise<Paddle | undefined> {
  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      environment:
        process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox" ? "sandbox" : "production",
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
      debug: true,
      eventCallback: (event) => {
        // Surface the real reason behind Paddle's generic "Something went wrong"
        console.log("[Paddle event]", event.name, JSON.stringify(event, null, 2))
      },
    })
  }
  return paddlePromise
}
