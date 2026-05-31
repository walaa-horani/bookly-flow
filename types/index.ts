import type { DefaultSession } from "next-auth"
import type { Tier } from "@/app/generated/prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      tier: Tier
    } & DefaultSession["user"]
  }

  interface User {
    tier: Tier
  }
}
