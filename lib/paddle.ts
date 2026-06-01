import { Paddle, Environment } from "@paddle/paddle-node-sdk"

if (!process.env.PADDLE_API_KEY) {
  throw new Error("PADDLE_API_KEY is not set")
}

export const paddle = new Paddle(process.env.PADDLE_API_KEY, {
  environment:
    process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox"
      ? Environment.Sandbox
      : Environment.Production,
})
