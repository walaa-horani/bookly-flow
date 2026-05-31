// lib/prisma.ts
// Prisma 7 uses driver adapters exclusively — no env-var URL fallback.
// PrismaNeonHttp uses Neon's HTTP API: zero-config, no WebSocket dependency.
import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaNeonHttp } from "@prisma/adapter-neon"

function createPrismaClient() {
  const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {})
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
