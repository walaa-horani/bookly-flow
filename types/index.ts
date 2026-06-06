import type { DefaultSession } from "next-auth"
import type { AccountType } from "@/app/generated/prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      activeOrgId: string | null
      accountType: AccountType
    } & DefaultSession["user"]
  }

  interface User {
    accountType: AccountType
    activeOrgId: string | null
  }
}
