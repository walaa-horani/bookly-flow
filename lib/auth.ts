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
  // Credentials provider only supports JWT sessions in Auth.js v5 — it never
  // persists a Session row, so "database" strategy silently produces no session.
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // First call after sign-in: seed the token from the authenticated user.
        token.id = user.id
        token.accountType = (user as { accountType?: string }).accountType as AccountType ?? "PROVIDER"
        token.activeOrgId = (user as { activeOrgId?: string | null }).activeOrgId ?? null
      } else if (token.id) {
        // Subsequent calls: refresh mutable fields (activeOrgId changes when the
        // user switches orgs) so the DB stays the source of truth.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { activeOrgId: true, accountType: true },
        })
        if (dbUser) {
          token.activeOrgId = dbUser.activeOrgId
          token.accountType = dbUser.accountType
        }
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.activeOrgId = (token.activeOrgId as string | null) ?? null
      session.user.accountType = (token.accountType as AccountType) ?? "PROVIDER"
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
