import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import type { AccountType } from "@/app/generated/prisma/client"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user?.password) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        return valid ? user : null
      },
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      session.user.activeOrgId = (user as { activeOrgId?: string | null }).activeOrgId ?? null
      session.user.accountType = (user as { accountType?: string }).accountType as AccountType ?? "PROVIDER"
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
