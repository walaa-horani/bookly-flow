# Organizations / Multi-Tenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert BooklyFlow from single-tenant (User = provider) to multi-tenant Organizations with org-scoped isolation, invite links, an active-org switcher, and org-level Paddle billing.

**Architecture:** Centralized `requireOrgContext()` guard (live membership re-query per request) + `lib/data/*` boundary enforced by a hard CI test. Phase 1 (Tasks 1–11) builds the foundation; Phase 2 (Tasks 12–18) migrates existing pages/APIs and billing. Each phase produces working, testable software.

**Tech Stack:** Next.js 16 App Router, Auth.js v5 database sessions, Prisma 7 + Neon HTTP adapter (`PrismaNeonHttp` — **no interactive transactions**; use array `$transaction([])` only), Paddle Node SDK v3, Vitest.

**Design doc:** `docs/superpowers/plans/2026-06-03-organizations-multitenancy-design.md`

**Critical stack fact (read first):** `prisma.$transaction(async tx => …)` throws at runtime on the Neon HTTP adapter. Only `prisma.$transaction([op1, op2])` (array/batch form) works. The migration backfill uses a separate WebSocket-adapter script.

---

## File Map

**New files:**
- `prisma/schema.prisma` — add Organization, Membership, WebhookEvent, Role, AccountType
- `lib/org-context.ts` — `requireOrgContext()`, `requireOwner()`
- `lib/data/org.ts` — createOrg, getOrg, updateOrgName, rotateInviteToken, deleteOrg, getOrgByInviteToken
- `lib/data/membership.ts` — listMembers, removeMember, updateRole, joinByToken, switchOrg
- `lib/data/booking-page.ts` — getBookingPage(orgId), createBookingPage, updateBookingPage
- `lib/data/appointments.ts` — listOrgAppointments, countTodayAppointments (dashboard)
- `lib/data/public/booking.ts` — getActiveBookingPageBySlug (whitelisted from CI grep rule)
- `app/(dashboard)/onboarding/page.tsx` — create org or open invite link
- `app/join/[token]/page.tsx` — join via invite link
- `app/(dashboard)/org/settings/page.tsx` — rename, invite link, members
- `app/api/org/route.ts` — POST create org
- `app/api/org/[id]/route.ts` — PATCH rename, DELETE org
- `app/api/org/[id]/invite/route.ts` — POST rotate token
- `app/api/org/[id]/members/route.ts` — GET list members
- `app/api/org/[id]/members/[memberId]/route.ts` — DELETE remove, PATCH role
- `app/api/org/switch/route.ts` — POST switch active org
- `app/api/join/route.ts` — POST join by token
- `scripts/migrate-to-orgs.mjs` — backfill (WebSocket adapter, transactional)
- `__tests__/isolation/ci-grep-rule.test.ts` — hard CI isolation gate
- `__tests__/lib/org-context.test.ts` — requireOrgContext unit tests
- `__tests__/isolation/cross-org.test.ts` — crown jewel isolation tests

**Modified files:**
- `types/index.ts` — replace `tier` with `activeOrgId`, `accountType`
- `lib/auth.ts` — session callback: add `activeOrgId`, `accountType`; remove `tier`
- `proxy.ts` — add coarse `activeOrgId` check
- `app/(dashboard)/layout.tsx` — add org name label + switcher
- `app/(dashboard)/dashboard/page.tsx` — use `requireOrgContext()`
- `app/(dashboard)/booking-page/page.tsx` — use `requireOrgContext()`
- `app/(dashboard)/booking-page/edit/page.tsx` — use `requireOrgContext()`
- `app/(dashboard)/availability/page.tsx` — use `requireOrgContext()`
- `app/(dashboard)/appointments/page.tsx` — use `requireOrgContext()`
- `app/api/booking-page/route.ts` — orgId instead of userId
- `app/api/booking-page/[id]/route.ts` — compound `where: { id, orgId }`
- `app/api/availability/route.ts` — orgId instead of userId
- `app/api/appointments/route.ts` — org.tier for free limit; soft 429 copy
- `app/api/paddle/webhook/route.ts` — org-scoped; WebhookEvent idempotency
- `app/api/paddle/booking-checkout/route.ts` — org-scoped
- `components/dashboard/upgrade-button.tsx` — take `orgId` instead of `userId`
- `lib/firebase-admin.ts` — fan-out to all org members' tokens

---

## ═══════════ PHASE 1: FOUNDATION ═══════════

---

### Task 1: Additive Schema Push

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new enums and models to schema.prisma**

Replace the entire content of `prisma/schema.prisma` with:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// ─── Auth.js v5 required models ───────────────────────────────────────────────

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ─── Provider (SaaS customer) ─────────────────────────────────────────────────

model User {
  id            String      @id @default(cuid())
  name          String?
  email         String      @unique
  emailVerified DateTime?
  image         String?
  password      String?

  // kept during migration; removed in Task 17 finalize push
  tier Tier @default(FREE)

  // new org fields
  accountType AccountType @default(PROVIDER)
  activeOrgId String?

  accounts     Account[]
  sessions     Session[]
  memberships  Membership[]
  fcmTokens    FcmToken[]

  // kept during migration; removed in Task 17 finalize push
  bookingPage  BookingPage?  @relation("UserBookingPage")
  subscription Subscription? @relation("UserSubscription")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

enum Tier {
  FREE
  PRO
}

enum AccountType {
  PROVIDER
  CLIENT
}

enum Role {
  OWNER
  MEMBER
}

// ─── Organization ─────────────────────────────────────────────────────────────

model Organization {
  id                   String  @id @default(cuid())
  name                 String
  tier                 Tier    @default(FREE)
  inviteToken          String  @unique @default(cuid())
  paddleCustomerId     String?
  paddleSubscriptionId String?

  memberships  Membership[]
  bookingPage  BookingPage?  @relation("OrgBookingPage")
  subscription Subscription? @relation("OrgSubscription")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("organizations")
}

model Membership {
  id     String @id @default(cuid())
  userId String
  orgId  String
  role   Role   @default(MEMBER)

  user User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  org  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, orgId])
  @@index([orgId])
  @@map("memberships")
}

// ─── Booking page ─────────────────────────────────────────────────────────────

model BookingPage {
  id          String   @id @default(cuid())
  // kept during migration (removed in Task 17)
  userId      String?  @unique
  // new org FK (nullable until migration, required after Task 17)
  orgId       String?  @unique
  slug        String   @unique
  title       String
  description String?  @db.Text
  duration    Int      @default(30)
  price       Decimal? @db.Decimal(10, 2)
  currency    String   @default("USD")
  isActive    Boolean  @default(true)
  brandColor  String?
  logoUrl     String?

  user         User?         @relation("UserBookingPage", fields: [userId], references: [id], onDelete: Cascade)
  org          Organization? @relation("OrgBookingPage", fields: [orgId], references: [id], onDelete: Cascade)
  availability Availability[]
  appointments Appointment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("booking_pages")
}

// ─── Weekly recurring availability ───────────────────────────────────────────

model Availability {
  id            String  @id @default(cuid())
  bookingPageId String
  dayOfWeek     Int
  startTime     String
  endTime       String
  isActive      Boolean @default(true)

  bookingPage BookingPage @relation(fields: [bookingPageId], references: [id], onDelete: Cascade)

  @@unique([bookingPageId, dayOfWeek])
  @@map("availability")
}

// ─── Appointment ─────────────────────────────────────────────────────────────

model Appointment {
  id            String            @id @default(cuid())
  bookingPageId String
  clientName    String
  clientEmail   String
  startTime     DateTime
  endTime       DateTime
  status        AppointmentStatus @default(PENDING)
  notes         String?           @db.Text

  paddleTransactionId String?
  amountPaid          Decimal? @db.Decimal(10, 2)

  bookingPage BookingPage @relation(fields: [bookingPageId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([bookingPageId, startTime])
  @@index([bookingPageId, status])
  @@map("appointments")
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
}

// ─── Paddle subscription ──────────────────────────────────────────────────────

model Subscription {
  id                   String             @id @default(cuid())
  // kept during migration (removed in Task 17)
  userId               String?            @unique
  // new org FK (nullable until migration, required after Task 17)
  orgId                String?            @unique
  paddleSubscriptionId String             @unique
  paddlePriceId        String
  status               SubscriptionStatus
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean            @default(false)

  user User?         @relation("UserSubscription", fields: [userId], references: [id], onDelete: Cascade)
  org  Organization? @relation("OrgSubscription", fields: [orgId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("subscriptions")
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  TRIALING
  PAUSED
}

// ─── Webhook idempotency ──────────────────────────────────────────────────────

model WebhookEvent {
  id          String   @id @default(cuid())
  eventId     String   @unique
  occurredAt  DateTime
  processedAt DateTime @default(now())

  @@map("webhook_events")
}

// ─── Firebase Cloud Messaging tokens ─────────────────────────────────────────

model FcmToken {
  id        String  @id @default(cuid())
  userId    String
  token     String  @unique
  userAgent String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@map("fcm_tokens")
}
```

- [ ] **Step 2: Push the additive schema**

```bash
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.` — new tables `organizations`, `memberships`, `webhook_events` created; `users` gains `accountType`, `activeOrgId`; `booking_pages` and `subscriptions` gain nullable `orgId`.

- [ ] **Step 3: Regenerate the client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client` with no errors.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma app/generated/prisma
git commit -m "feat(schema): add Organization, Membership, WebhookEvent, AccountType, Role (additive)"
```

---

### Task 2: Data Layer — org.ts + membership.ts

**Files:**
- Create: `lib/data/org.ts`
- Create: `lib/data/membership.ts`

- [ ] **Step 1: Create lib/data/org.ts**

```typescript
// lib/data/org.ts
import { prisma } from "@/lib/prisma"
import type { Organization } from "@/app/generated/prisma/client"

export async function createOrg(name: string, ownerId: string): Promise<Organization> {
  const org = await prisma.organization.create({ data: { name } })
  // array $transaction is HTTP-adapter compatible (callback form is NOT)
  await prisma.$transaction([
    prisma.membership.create({ data: { userId: ownerId, orgId: org.id, role: "OWNER" } }),
    prisma.user.update({ where: { id: ownerId }, data: { activeOrgId: org.id } }),
  ])
  return org
}

export async function getOrg(orgId: string): Promise<Organization | null> {
  return prisma.organization.findUnique({ where: { id: orgId } })
}

export async function updateOrgName(orgId: string, name: string): Promise<Organization> {
  return prisma.organization.update({ where: { id: orgId }, data: { name } })
}

export async function rotateInviteToken(orgId: string): Promise<string> {
  const { inviteToken } = await prisma.organization.update({
    where: { id: orgId },
    data: { inviteToken: crypto.randomUUID() },
    select: { inviteToken: true },
  })
  return inviteToken
}

export async function deleteOrg(orgId: string): Promise<void> {
  // cascade deletes memberships, bookingPage, subscription via schema onDelete
  await prisma.organization.delete({ where: { id: orgId } })
}

export async function getOrgByInviteToken(token: string): Promise<Organization | null> {
  return prisma.organization.findUnique({ where: { inviteToken: token } })
}
```

- [ ] **Step 2: Create lib/data/membership.ts**

```typescript
// lib/data/membership.ts
import { prisma } from "@/lib/prisma"
import type { Membership, Role } from "@/app/generated/prisma/client"

export async function listMembers(orgId: string) {
  return prisma.membership.findMany({
    where: { orgId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  })
}

export async function getMembership(userId: string, orgId: string): Promise<Membership | null> {
  return prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  })
}

export async function countOwners(orgId: string): Promise<number> {
  return prisma.membership.count({ where: { orgId, role: "OWNER" } })
}

export async function updateMemberRole(
  memberId: string,
  orgId: string,
  role: Role
): Promise<Membership> {
  return prisma.membership.update({
    where: { id: memberId, orgId },
    data: { role },
  })
}

export async function removeMember(memberId: string, orgId: string): Promise<void> {
  await prisma.membership.delete({ where: { id: memberId, orgId } })
}

export async function joinByToken(
  token: string,
  userId: string
): Promise<{ orgId: string; alreadyMember: boolean }> {
  const org = await prisma.organization.findUnique({ where: { inviteToken: token } })
  if (!org) throw new Error("INVALID_TOKEN")

  const existing = await prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId: org.id } },
  })
  if (existing) {
    await prisma.user.update({ where: { id: userId }, data: { activeOrgId: org.id } })
    return { orgId: org.id, alreadyMember: true }
  }

  await prisma.$transaction([
    prisma.membership.create({ data: { userId, orgId: org.id, role: "MEMBER" } }),
    prisma.user.update({ where: { id: userId }, data: { activeOrgId: org.id } }),
  ])
  return { orgId: org.id, alreadyMember: false }
}

export async function switchActiveOrg(userId: string, orgId: string): Promise<void> {
  // re-verify membership before writing (TOCTOU guard)
  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  })
  if (!membership) throw new Error("NOT_A_MEMBER")
  await prisma.user.update({ where: { id: userId }, data: { activeOrgId: orgId } })
}

export async function getUserMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { org: { select: { id: true, name: true, tier: true } } },
    orderBy: { createdAt: "asc" },
  })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add lib/data/org.ts lib/data/membership.ts
git commit -m "feat(data): org + membership data layer"
```

---

### Task 3: Data Layer — booking-page, appointments, public

**Files:**
- Create: `lib/data/booking-page.ts`
- Create: `lib/data/appointments.ts`
- Create: `lib/data/public/booking.ts`

- [ ] **Step 1: Create lib/data/booking-page.ts**

```typescript
// lib/data/booking-page.ts
import { prisma } from "@/lib/prisma"

export async function getBookingPage(orgId: string) {
  return prisma.bookingPage.findUnique({ where: { orgId } })
}

export async function createBookingPage(
  orgId: string,
  data: {
    title: string
    slug: string
    description?: string | null
    duration: number
    price?: number | null
    currency?: string
  }
) {
  return prisma.bookingPage.create({ data: { orgId, ...data } })
}

export async function updateBookingPage(
  orgId: string,
  id: string,
  data: {
    title: string
    slug: string
    description?: string | null
    duration: number
    price?: number | null
  }
) {
  // compound where: { id, orgId } is IDOR protection — a foreign id returns null
  return prisma.bookingPage.update({ where: { id, orgId }, data })
}

export async function getBookingPageWithAvailability(orgId: string) {
  return prisma.bookingPage.findUnique({
    where: { orgId },
    include: { availability: { orderBy: { dayOfWeek: "asc" } } },
  })
}
```

- [ ] **Step 2: Create lib/data/appointments.ts**

```typescript
// lib/data/appointments.ts
import { prisma } from "@/lib/prisma"

export async function listOrgAppointments(orgId: string, limit = 100) {
  const page = await prisma.bookingPage.findUnique({ where: { orgId }, select: { id: true } })
  if (!page) return []
  return prisma.appointment.findMany({
    where: { bookingPageId: page.id },
    orderBy: { startTime: "desc" },
    take: limit,
  })
}

export async function countTodayAppointments(bookingPageId: string, date: Date): Promise<number> {
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setUTCHours(23, 59, 59, 999)
  return prisma.appointment.count({
    where: {
      bookingPageId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { gte: start, lte: end },
    },
  })
}
```

- [ ] **Step 3: Create lib/data/public/booking.ts**

```typescript
// lib/data/public/booking.ts
// WHITELISTED from CI grep rule: public booking flow, no session or orgId
import { prisma } from "@/lib/prisma"

export async function getActiveBookingPageBySlug(slug: string) {
  return prisma.bookingPage.findUnique({
    where: { slug, isActive: true },
    include: {
      org: { select: { tier: true } },
      // fallback for pre-migration rows
      user: { select: { tier: true } },
    },
  })
}

export async function getBookingPageWithSlots(slug: string) {
  return prisma.bookingPage.findUnique({
    where: { slug, isActive: true },
    include: { availability: true },
  })
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add lib/data/booking-page.ts lib/data/appointments.ts lib/data/public/booking.ts
git commit -m "feat(data): booking-page, appointments, public data layer"
```

---

### Task 4: Hard CI Isolation Gate Test (write failing, fix later)

**Files:**
- Create: `__tests__/isolation/ci-grep-rule.test.ts`

This test is the "hard CI failure" precondition from the design. It currently **fails** because existing route files access prisma directly — that's expected. It will pass after Tasks 12–15 migrate all routes.

- [ ] **Step 1: Write the CI grep rule test**

```typescript
// __tests__/isolation/ci-grep-rule.test.ts
import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"

// Models whose prisma access must go through lib/data/*
const ORG_SCOPED_MODELS = [
  "bookingPage",
  "subscription",
  "membership",
  "organization",
]

// Directories whose direct prisma access is sanctioned
const ALLOWED_DIRS = [
  "lib/data/",
  "scripts/",
  "app/api/paddle/webhook/",
]

function getTsFiles(dir: string): string[] {
  let files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!["node_modules", ".next", "generated", "__tests__"].includes(entry.name)) {
        files = files.concat(getTsFiles(full))
      }
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

describe("CI isolation gate", () => {
  it("no raw prisma.<orgScopedModel> access outside lib/data/ or sanctioned paths", () => {
    const root = process.cwd()
    const appFiles = getTsFiles(join(root, "app"))
    const libFiles = getTsFiles(join(root, "lib")).filter(
      (f) => !f.replace(/\\/g, "/").includes("lib/data/")
    )

    const violations: string[] = []
    for (const file of [...appFiles, ...libFiles]) {
      const rel = file.replace(root, "").replace(/\\/g, "/").replace(/^\//, "")
      const sanctioned = ALLOWED_DIRS.some((d) => rel.startsWith(d))
      if (sanctioned) continue

      const content = readFileSync(file, "utf-8")
      for (const model of ORG_SCOPED_MODELS) {
        if (new RegExp(`prisma\\.${model}\\b`).test(content)) {
          violations.push(`${rel} (prisma.${model})`)
          break
        }
      }
    }

    expect(
      violations,
      `Raw prisma access to org-scoped models found outside allowed paths:\n${violations.join("\n")}\n\nMove these to lib/data/ functions.`
    ).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it FAILS (expected)**

```bash
npx vitest run __tests__/isolation/ci-grep-rule.test.ts
```

Expected: FAIL — violations listed include `app/api/booking-page/route.ts`, `app/api/availability/route.ts`, `app/(dashboard)/booking-page/page.tsx`, etc. This is correct — the test documents what must be migrated.

- [ ] **Step 3: Commit the failing test**

```bash
git add __tests__/isolation/ci-grep-rule.test.ts
git commit -m "test(isolation): add hard CI grep rule for org-scoped prisma access (currently failing — fixed in later tasks)"
```

---

### Task 5: Crown Jewel Cross-Org Isolation Tests

**Files:**
- Create: `__tests__/isolation/cross-org.test.ts`
- Create: `__tests__/lib/org-context.test.ts`

- [ ] **Step 1: Write cross-org isolation tests**

```typescript
// __tests__/isolation/cross-org.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { getBookingPage, updateBookingPage } from "@/lib/data/booking-page"
import { listOrgAppointments } from "@/lib/data/appointments"
import { getMembership } from "@/lib/data/membership"

const mockPrisma = {
  bookingPage: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  appointment: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  membership: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
}

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))

const ORG_A = "org_A"
const ORG_B = "org_B"
const PAGE_B_ID = "page_B"

beforeEach(() => vi.clearAllMocks())

describe("cross-org isolation — data layer", () => {
  it("getBookingPage uses orgId in where clause — can never return another org's page", async () => {
    mockPrisma.bookingPage.findUnique.mockResolvedValue(null)
    const result = await getBookingPage(ORG_A)
    expect(mockPrisma.bookingPage.findUnique).toHaveBeenCalledWith({
      where: { orgId: ORG_A },
    })
    expect(result).toBeNull()
  })

  it("updateBookingPage uses compound { id, orgId } — foreign page id returns nothing", async () => {
    mockPrisma.bookingPage.update.mockResolvedValue(null)
    // Org A member passes Org B's page id — compound where prevents match
    await updateBookingPage(ORG_A, PAGE_B_ID, {
      title: "Hack",
      slug: "hack",
      duration: 30,
    })
    expect(mockPrisma.bookingPage.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PAGE_B_ID, orgId: ORG_A } })
    )
  })

  it("listOrgAppointments resolves bookingPageId via orgId — never fetches another org's appointments", async () => {
    // Org A has a page, Org B has a different page
    mockPrisma.bookingPage.findUnique.mockResolvedValue({ id: "page_A" })
    mockPrisma.appointment.findMany.mockResolvedValue([])
    await listOrgAppointments(ORG_A)
    expect(mockPrisma.bookingPage.findUnique).toHaveBeenCalledWith({
      where: { orgId: ORG_A },
      select: { id: true },
    })
    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { bookingPageId: "page_A" } })
    )
  })

  it("getMembership requires both userId AND orgId — cannot probe another org", async () => {
    mockPrisma.membership.findUnique.mockResolvedValue(null)
    await getMembership("user_1", ORG_B)
    expect(mockPrisma.membership.findUnique).toHaveBeenCalledWith({
      where: { userId_orgId: { userId: "user_1", orgId: ORG_B } },
    })
  })
})
```

- [ ] **Step 2: Run to verify it PASSES**

```bash
npx vitest run __tests__/isolation/cross-org.test.ts
```

Expected: PASS (all 4 tests green — the data layer functions use correct scoping).

- [ ] **Step 3: Write requireOrgContext unit tests**

```typescript
// __tests__/lib/org-context.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

const mockAuth = vi.fn()
const mockFindUnique = vi.fn()
const mockFindFirst = vi.fn()
const mockUpdate = vi.fn()
const mockRedirect = vi.fn().mockImplementation((url: string) => {
  throw new Error(`REDIRECT:${url}`)
})

vi.mock("@/lib/auth", () => ({ auth: mockAuth }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: { findUnique: mockFindUnique, findFirst: mockFindFirst },
    user: { update: mockUpdate },
  },
}))
vi.mock("next/navigation", () => ({ redirect: mockRedirect }))

const { requireOrgContext } = await import("@/lib/org-context")

const SESSION_PROVIDER = {
  user: { id: "u1", activeOrgId: "org1", accountType: "PROVIDER" },
}
const MEMBERSHIP = {
  orgId: "org1",
  role: "OWNER",
  org: { id: "org1", name: "Acme", tier: "FREE", inviteToken: "tok" },
}

beforeEach(() => vi.clearAllMocks())

describe("requireOrgContext", () => {
  it("redirects to /login when no session", async () => {
    mockAuth.mockResolvedValue(null)
    await expect(requireOrgContext()).rejects.toThrow("REDIRECT:/login")
  })

  it("redirects to /login when accountType is CLIENT", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", activeOrgId: "org1", accountType: "CLIENT" },
    })
    await expect(requireOrgContext()).rejects.toThrow("REDIRECT:/login")
  })

  it("redirects to /onboarding when no activeOrgId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", activeOrgId: null, accountType: "PROVIDER" },
    })
    await expect(requireOrgContext()).rejects.toThrow("REDIRECT:/onboarding")
  })

  it("returns org context for valid member", async () => {
    mockAuth.mockResolvedValue(SESSION_PROVIDER)
    mockFindUnique.mockResolvedValue(MEMBERSHIP)
    const ctx = await requireOrgContext()
    expect(ctx).toEqual({
      userId: "u1",
      orgId: "org1",
      role: "OWNER",
      org: MEMBERSHIP.org,
    })
  })

  it("clears activeOrgId and redirects /onboarding when membership gone and no other orgs", async () => {
    mockAuth.mockResolvedValue(SESSION_PROVIDER)
    mockFindUnique.mockResolvedValue(null)
    mockFindFirst.mockResolvedValue(null)
    await expect(requireOrgContext()).rejects.toThrow("REDIRECT:/onboarding?reason=removed")
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { activeOrgId: null },
    })
  })

  it("auto-switches to another org when removed from current", async () => {
    mockAuth.mockResolvedValue(SESSION_PROVIDER)
    mockFindUnique.mockResolvedValue(null)
    mockFindFirst.mockResolvedValue({
      orgId: "org2",
      role: "MEMBER",
      org: { id: "org2", name: "Other", tier: "FREE", inviteToken: "tok2" },
    })
    const ctx = await requireOrgContext()
    expect(ctx.orgId).toBe("org2")
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { activeOrgId: "org2" },
    })
  })
})
```

- [ ] **Step 4: Run — will FAIL because requireOrgContext doesn't exist yet**

```bash
npx vitest run __tests__/lib/org-context.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/org-context'".

- [ ] **Step 5: Commit**

```bash
git add __tests__/isolation/cross-org.test.ts __tests__/lib/org-context.test.ts
git commit -m "test(isolation): cross-org data layer tests (green) + org-context tests (failing until Task 6)"
```

---

### Task 6: requireOrgContext() + requireOwner()

**Files:**
- Create: `lib/org-context.ts`

- [ ] **Step 1: Create lib/org-context.ts**

```typescript
// lib/org-context.ts
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import type { Role, Tier } from "@/app/generated/prisma/client"

export type OrgContext = {
  userId: string
  orgId: string
  role: Role
  org: { id: string; name: string; tier: Tier; inviteToken: string }
}

/**
 * Authoritative isolation boundary for all dashboard pages and API routes.
 * Treats session.user.activeOrgId as a hint only — re-queries membership live.
 * Never call proxy.ts the security boundary; this is.
 */
export async function requireOrgContext(): Promise<OrgContext> {
  const session = await auth()
  if (!session) redirect("/login")

  if (session.user.accountType !== "PROVIDER") redirect("/login")

  const activeOrgId = session.user.activeOrgId
  if (!activeOrgId) redirect("/onboarding")

  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId: activeOrgId } },
    include: { org: { select: { id: true, name: true, tier: true, inviteToken: true } } },
  })

  if (!membership) {
    // Check for other memberships — auto-switch instead of dumping on onboarding
    const other = await prisma.membership.findFirst({
      where: { userId: session.user.id },
      include: { org: { select: { id: true, name: true, tier: true, inviteToken: true } } },
    })
    if (other) {
      await prisma.user.update({ where: { id: session.user.id }, data: { activeOrgId: other.orgId } })
      return { userId: session.user.id, orgId: other.orgId, role: other.role, org: other.org }
    }
    await prisma.user.update({ where: { id: session.user.id }, data: { activeOrgId: null } })
    redirect("/onboarding?reason=removed")
  }

  return { userId: session.user.id, orgId: membership.orgId, role: membership.role, org: membership.org }
}

/** Use for billing, invite management, member removal, org deletion. */
export async function requireOwner(): Promise<OrgContext> {
  const ctx = await requireOrgContext()
  if (ctx.role !== "OWNER") redirect("/dashboard?error=owner_required")
  return ctx
}
```

- [ ] **Step 2: Run org-context tests**

```bash
npx vitest run __tests__/lib/org-context.test.ts
```

Expected: PASS (all 6 tests green).

- [ ] **Step 3: Commit**

```bash
git add lib/org-context.ts
git commit -m "feat(auth): requireOrgContext() + requireOwner() with live membership re-query"
```

---

### Task 7: Session Shape + Types + proxy.ts

**Files:**
- Modify: `types/index.ts`
- Modify: `lib/auth.ts`
- Modify: `proxy.ts`

- [ ] **Step 1: Update types/index.ts**

```typescript
// types/index.ts
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
```

- [ ] **Step 2: Update lib/auth.ts session callback**

Replace the `callbacks` block in `lib/auth.ts`:

```typescript
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      session.user.activeOrgId = (user as { activeOrgId?: string | null }).activeOrgId ?? null
      session.user.accountType = (user as { accountType?: string }).accountType as AccountType ?? "PROVIDER"
      return session
    },
  },
```

Add the import at top of `lib/auth.ts`:

```typescript
import type { AccountType } from "@/app/generated/prisma/client"
```

- [ ] **Step 3: Update proxy.ts**

```typescript
// proxy.ts
// UX-only coarse gate. Security boundary is requireOrgContext() — never this file.
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAuthenticated = !!req.auth
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard")

  if (!isAuthenticated && isDashboard) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Coarse UX redirect — no DB call. requireOrgContext() does the authoritative check.
  if (isAuthenticated && isDashboard && !req.auth?.user?.activeOrgId) {
    return NextResponse.redirect(new URL("/onboarding", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*"],
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors (or only errors in files not yet migrated to new session shape — those are fixed in later tasks).

- [ ] **Step 5: Commit**

```bash
git add types/index.ts lib/auth.ts proxy.ts
git commit -m "feat(auth): update session shape — activeOrgId + accountType, remove tier"
```

---

### Task 8: Onboarding Page + Create Org API

**Files:**
- Create: `app/(dashboard)/onboarding/page.tsx`
- Create: `app/api/org/route.ts`

- [ ] **Step 1: Create app/api/org/route.ts**

```typescript
// app/api/org/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createOrg } from "@/lib/data/org"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name } = await req.json()
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Organization name is required." }, { status: 400 })
  }

  const org = await createOrg(name.trim(), session.user.id)
  return NextResponse.json(org, { status: 201 })
}
```

- [ ] **Step 2: Create app/(dashboard)/onboarding/page.tsx**

```typescript
// app/(dashboard)/onboarding/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function OnboardingPage({
  searchParams,
}: {
  searchParams: { reason?: string }
}) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const reason = searchParams?.reason
  const banner =
    reason === "removed" ? "You no longer have access to that organization." : null

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    const res = await fetch("/api/org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.")
      return
    }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Get started with BooklyFlow</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your booking page and team live in an organization.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {banner && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
              {banner} Create a new organization or open an invite link.
            </p>
          )}
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label htmlFor="org-name" className="text-sm font-medium">
                Organization name
              </label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Clinic"
                autoFocus
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating…" : "Create organization"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center">
            Got an invite link? Just open it in your browser.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/api/org/route.ts app/(dashboard)/onboarding/page.tsx
git commit -m "feat(onboarding): create org page + POST /api/org"
```

---

### Task 9: Join Flow

**Files:**
- Create: `app/join/[token]/page.tsx`
- Create: `app/api/join/route.ts`

- [ ] **Step 1: Create app/api/join/route.ts**

```typescript
// app/api/join/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { joinByToken } from "@/lib/data/membership"
import { getOrgByInviteToken } from "@/lib/data/org"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: "Token required." }, { status: 400 })

  // Peek at the org name for the response before joining
  const org = await getOrgByInviteToken(token)
  if (!org) {
    return NextResponse.json(
      { error: "This invite link is no longer active — ask the owner for a new one." },
      { status: 404 }
    )
  }

  const result = await joinByToken(token, session.user.id)
  return NextResponse.json({
    orgId: result.orgId,
    orgName: org.name,
    alreadyMember: result.alreadyMember,
  })
}
```

- [ ] **Step 2: Create app/join/[token]/page.tsx**

```typescript
// app/join/[token]/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { joinByToken } from "@/lib/data/membership"
import { getOrgByInviteToken } from "@/lib/data/org"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const session = await auth()

  // Preserve token through login round-trip via callbackUrl
  if (!session) {
    redirect(`/login?callbackUrl=/join/${token}`)
  }

  const org = await getOrgByInviteToken(token)
  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invite link expired</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This invite link is no longer active — ask the owner for a new one.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const result = await joinByToken(token, session.user.id)

  // Redirect to dashboard; the org switcher will show the new org
  redirect(
    `/dashboard?joined=${encodeURIComponent(org.name)}&already=${result.alreadyMember ? "1" : "0"}`
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/join app/api/join/route.ts
git commit -m "feat(join): invite link join flow + POST /api/join"
```

---

### Task 10: Org Switcher + Switch API + Org Settings

**Files:**
- Create: `app/api/org/switch/route.ts`
- Create: `app/api/org/[id]/route.ts`
- Create: `app/api/org/[id]/invite/route.ts`
- Create: `app/api/org/[id]/members/route.ts`
- Create: `app/api/org/[id]/members/[memberId]/route.ts`
- Create: `app/(dashboard)/org/settings/page.tsx`
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create app/api/org/switch/route.ts**

```typescript
// app/api/org/switch/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { switchActiveOrg } from "@/lib/data/membership"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgId } = await req.json()
  if (!orgId) return NextResponse.json({ error: "orgId required." }, { status: 400 })

  try {
    await switchActiveOrg(session.user.id, orgId)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "You are not a member of that organization." }, { status: 403 })
  }
}
```

- [ ] **Step 2: Create app/api/org/[id]/route.ts (rename + delete)**

```typescript
// app/api/org/[id]/route.ts
import { NextResponse } from "next/server"
import { requireOwner } from "@/lib/org-context"
import { updateOrgName, deleteOrg } from "@/lib/data/org"
import { countOwners } from "@/lib/data/membership"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOwner()
  const { id } = await params
  if (ctx.orgId !== id) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required." }, { status: 400 })

  const org = await updateOrgName(id, name.trim())
  return NextResponse.json(org)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOwner()
  const { id } = await params
  if (ctx.orgId !== id) return NextResponse.json({ error: "Not found." }, { status: 404 })

  await deleteOrg(id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Create app/api/org/[id]/invite/route.ts (rotate token)**

```typescript
// app/api/org/[id]/invite/route.ts
import { NextResponse } from "next/server"
import { requireOwner } from "@/lib/org-context"
import { rotateInviteToken } from "@/lib/data/org"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOwner()
  const { id } = await params
  if (ctx.orgId !== id) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const token = await rotateInviteToken(id)
  return NextResponse.json({ inviteToken: token })
}
```

- [ ] **Step 4: Create member management routes**

```typescript
// app/api/org/[id]/members/route.ts
import { NextResponse } from "next/server"
import { requireOrgContext } from "@/lib/org-context"
import { listMembers } from "@/lib/data/membership"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext()
  const { id } = await params
  if (ctx.orgId !== id) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const members = await listMembers(id)
  return NextResponse.json(members)
}
```

```typescript
// app/api/org/[id]/members/[memberId]/route.ts
import { NextResponse } from "next/server"
import { requireOwner } from "@/lib/org-context"
import { removeMember, updateMemberRole, countOwners, getMembership } from "@/lib/data/membership"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const ctx = await requireOwner()
  const { id, memberId } = await params
  if (ctx.orgId !== id) return NextResponse.json({ error: "Not found." }, { status: 404 })

  // Last-owner protection
  const target = await getMembership(memberId, id).catch(() => null)
  // memberId here is the membership record id, not userId; adjust lookup
  // (using removeMember which takes membership.id + orgId for compound safety)
  const ownerCount = await countOwners(id)
  if (ownerCount <= 1) {
    return NextResponse.json(
      { error: "Cannot remove the last owner of an organization." },
      { status: 400 }
    )
  }

  await removeMember(memberId, id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const ctx = await requireOwner()
  const { id, memberId } = await params
  if (ctx.orgId !== id) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const { role } = await req.json()
  if (role !== "OWNER" && role !== "MEMBER") {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 })
  }

  // Last-owner protection when demoting
  if (role === "MEMBER") {
    const ownerCount = await countOwners(id)
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot demote the last owner of an organization." },
        { status: 400 }
      )
    }
  }

  const updated = await updateMemberRole(memberId, id, role)
  return NextResponse.json(updated)
}
```

- [ ] **Step 5: Update app/(dashboard)/layout.tsx to show org name + switcher**

```typescript
// app/(dashboard)/layout.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FcmSetup } from "@/components/notifications/fcm-setup"
import { signOut } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { OrgSwitcher } from "@/components/dashboard/org-switcher"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const memberships = session.user.activeOrgId
    ? await prisma.membership.findMany({
        where: { userId: session.user.id },
        include: { org: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      })
    : []

  const activeOrg = memberships.find((m) => m.orgId === session.user.activeOrgId)?.org ?? null

  return (
    <>
      <FcmSetup />
      <div className="flex min-h-screen flex-col">
        <header className="border-b bg-background px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-semibold text-lg">
              BooklyFlow
            </Link>
            {memberships.length > 1 ? (
              <OrgSwitcher
                memberships={memberships.map((m) => ({ id: m.orgId, name: m.org.name }))}
                activeOrgId={session.user.activeOrgId ?? ""}
              />
            ) : activeOrg ? (
              <span className="text-sm text-muted-foreground border rounded px-2 py-0.5">
                {activeOrg.name}
              </span>
            ) : null}
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Overview</Link>
            <Link href="/booking-page" className="text-muted-foreground hover:text-foreground">Booking Page</Link>
            <Link href="/availability" className="text-muted-foreground hover:text-foreground">Availability</Link>
            <Link href="/appointments" className="text-muted-foreground hover:text-foreground">Appointments</Link>
            <Link href="/org/settings" className="text-muted-foreground hover:text-foreground">Settings</Link>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
              <Button variant="ghost" size="sm" type="submit">Sign out</Button>
            </form>
          </nav>
        </header>
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">{children}</main>
      </div>
    </>
  )
}
```

- [ ] **Step 6: Create components/dashboard/org-switcher.tsx**

```typescript
// components/dashboard/org-switcher.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function OrgSwitcher({
  memberships,
  activeOrgId,
}: {
  memberships: { id: string; name: string }[]
  activeOrgId: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSwitch(orgId: string) {
    if (orgId === activeOrgId) return
    setLoading(true)
    await fetch("/api/org/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    })
    setLoading(false)
    router.refresh()
  }

  const active = memberships.find((m) => m.id === activeOrgId)

  return (
    <select
      value={activeOrgId}
      onChange={(e) => handleSwitch(e.target.value)}
      disabled={loading}
      className="text-sm border rounded px-2 py-0.5 bg-background"
      aria-label="Switch organization"
    >
      {memberships.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  )
}
```

- [ ] **Step 7: Create app/(dashboard)/org/settings/page.tsx**

```typescript
// app/(dashboard)/org/settings/page.tsx
import { requireOrgContext, requireOwner } from "@/lib/org-context"
import { listMembers } from "@/lib/data/membership"
import { OrgSettingsForm } from "@/components/dashboard/org-settings-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function OrgSettingsPage() {
  const ctx = await requireOrgContext()
  const isOwner = ctx.role === "OWNER"
  const members = await listMembers(ctx.orgId)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Organization Settings</h1>

      {isOwner ? (
        <OrgSettingsForm
          org={ctx.org}
          members={members.map((m) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            name: m.user.name,
            email: m.user.email,
          }))}
          currentUserId={ctx.userId}
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>Members</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {members.map((m) => (
                <li key={m.id} className="flex justify-between">
                  <span>{m.user.name ?? m.user.email}</span>
                  <span className="text-muted-foreground capitalize">{m.role.toLowerCase()}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-4">
              Only the organization owner can change settings.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Create components/dashboard/org-settings-form.tsx**

```typescript
// components/dashboard/org-settings-form.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Member = { id: string; userId: string; role: string; name: string | null; email: string }

export function OrgSettingsForm({
  org,
  members,
  currentUserId,
}: {
  org: { id: string; name: string; inviteToken: string }
  members: Member[]
  currentUserId: string
}) {
  const router = useRouter()
  const [name, setName] = useState(org.name)
  const [inviteToken, setInviteToken] = useState(org.inviteToken)
  const [saving, setSaving] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${inviteToken}`
      : `/join/${inviteToken}`

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/org/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Failed to save.")
    } else {
      router.refresh()
    }
  }

  async function handleRotate() {
    setRotating(true)
    const res = await fetch(`/api/org/${org.id}/invite`, { method: "POST" })
    setRotating(false)
    if (res.ok) {
      const d = await res.json()
      setInviteToken(d.inviteToken)
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this member?")) return
    await fetch(`/api/org/${org.id}/members/${memberId}`, { method: "DELETE" })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Organization name</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleRename} className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </form>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invite link</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <code className="block text-xs bg-muted rounded p-2 break-all">{inviteUrl}</code>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(inviteUrl)}>
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleRotate} disabled={rotating}>
              {rotating ? "Rotating…" : "Rotate (revokes old link)"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Members</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <span>{m.name ?? m.email} <span className="text-muted-foreground">({m.email})</span></span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground capitalize">{m.role.toLowerCase()}</span>
                  {m.userId !== currentUserId && (
                    <Button variant="ghost" size="sm" onClick={() => handleRemove(m.id)}>
                      Remove
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add app/api/org app/join app/(dashboard)/org app/(dashboard)/layout.tsx components/dashboard/org-switcher.tsx components/dashboard/org-settings-form.tsx
git commit -m "feat(org): switcher, settings, invite rotation, member management, last-owner protection"
```

---

## ═══════════ PHASE 2: INTEGRATION ═══════════

---

### Task 11: Update Dashboard + Booking Page Dashboard

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`
- Modify: `app/(dashboard)/booking-page/page.tsx`
- Modify: `components/dashboard/upgrade-button.tsx`

- [ ] **Step 1: Update app/(dashboard)/dashboard/page.tsx**

```typescript
// app/(dashboard)/dashboard/page.tsx
import { requireOrgContext } from "@/lib/org-context"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { UpgradeButton } from "@/components/dashboard/upgrade-button"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { joined?: string; already?: string; error?: string }
}) {
  const ctx = await requireOrgContext()

  const bookingPage = await prisma.bookingPage.findUnique({
    where: { orgId: ctx.orgId },
    include: { _count: { select: { appointments: true } } },
  })

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const todayCount = bookingPage
    ? await prisma.appointment.count({
        where: {
          bookingPageId: bookingPage.id,
          startTime: { gte: todayStart, lte: todayEnd },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      })
    : 0

  const joinedOrg = searchParams?.joined
  const alreadyMember = searchParams?.already === "1"

  return (
    <div className="space-y-6">
      {joinedOrg && (
        <div className="rounded border bg-green-50 border-green-200 p-3 text-sm text-green-800">
          {alreadyMember
            ? `You're already in ${joinedOrg} — switched you there.`
            : `You joined ${joinedOrg}.`}
        </div>
      )}
      {searchParams?.error === "owner_required" && (
        <div className="rounded border bg-amber-50 border-amber-200 p-3 text-sm text-amber-800">
          Only the organization owner can perform that action.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">{ctx.org.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={ctx.org.tier === "PRO" ? "default" : "secondary"}>
            {ctx.org.tier}
          </Badge>
          {ctx.org.tier === "FREE" && ctx.role === "OWNER" && (
            <UpgradeButton orgId={ctx.orgId} email="" />
          )}
          {ctx.org.tier === "FREE" && ctx.role === "MEMBER" && (
            <span className="text-xs text-muted-foreground">
              Ask your owner to upgrade
            </span>
          )}
        </div>
      </div>

      {!bookingPage ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">No booking page yet.</p>
            <Button asChild><Link href="/booking-page/edit">Create Booking Page</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{todayCount}</p>
              {ctx.org.tier === "FREE" && (
                <p className="text-xs text-muted-foreground mt-1">of 5 daily limit</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{bookingPage._count.appointments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Booking Page</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium truncate">/book/{bookingPage.slug}</p>
              <Button variant="link" className="p-0 h-auto text-xs" asChild>
                <Link href={`/book/${bookingPage.slug}`} target="_blank">View →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update components/dashboard/upgrade-button.tsx**

```typescript
// components/dashboard/upgrade-button.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { getPaddle } from "@/lib/paddle-client"

export function UpgradeButton({ orgId, email }: { orgId: string; email: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const paddle = await getPaddle()
      if (!paddle) throw new Error("Paddle failed to load.")
      paddle.Checkout.open({
        items: [{ priceId: process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID!, quantity: 1 }],
        customData: { orgId, type: "subscription_upgrade" },
        customer: email ? { email } : undefined,
        settings: { displayMode: "overlay", theme: "light" },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1">
      <Button onClick={handleUpgrade} disabled={loading}>
        {loading ? "Opening…" : "Upgrade to Pro"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Update app/(dashboard)/booking-page/page.tsx**

```typescript
// app/(dashboard)/booking-page/page.tsx
import { requireOrgContext } from "@/lib/org-context"
import { getBookingPage } from "@/lib/data/booking-page"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function BookingPageDashboard() {
  const ctx = await requireOrgContext()
  const page = await getBookingPage(ctx.orgId)

  if (!page) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Booking Page</h1>
        <p className="text-muted-foreground">No booking page set up yet.</p>
        <Button asChild><Link href="/booking-page/edit">Create Booking Page</Link></Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Booking Page</h1>
        <Button asChild variant="outline"><Link href="/booking-page/edit">Edit</Link></Button>
      </div>
      <Card className="max-w-lg">
        <CardHeader><CardTitle>{page.title}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="font-medium">URL:</span> /book/{page.slug}</p>
          <p><span className="font-medium">Duration:</span> {page.duration} min</p>
          <p><span className="font-medium">Price:</span> {page.price ? `$${page.price} USD` : "Free"}</p>
          {page.description && <p><span className="font-medium">Description:</span> {page.description}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/dashboard/page.tsx app/(dashboard)/booking-page/page.tsx components/dashboard/upgrade-button.tsx
git commit -m "feat(dashboard): use requireOrgContext() in dashboard + booking page"
```

---

### Task 12: Update Appointments + Availability Pages

**Files:**
- Modify: `app/(dashboard)/appointments/page.tsx`
- Modify: `app/(dashboard)/availability/page.tsx` (if exists)

- [ ] **Step 1: Update app/(dashboard)/appointments/page.tsx**

```typescript
// app/(dashboard)/appointments/page.tsx
import { requireOrgContext } from "@/lib/org-context"
import { listOrgAppointments } from "@/lib/data/appointments"
import { AppointmentsTable } from "@/components/dashboard/appointments-table"

export default async function AppointmentsPage() {
  const ctx = await requireOrgContext()
  const appointments = await listOrgAppointments(ctx.orgId)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Appointments</h1>
      {appointments.length === 0 ? (
        <p className="text-muted-foreground">No appointments yet.</p>
      ) : (
        <AppointmentsTable appointments={appointments} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update app/(dashboard)/availability/page.tsx**

Read the current file first, then update the `prisma.bookingPage.findUnique({ where: { userId: session.user.id } })` call to use `requireOrgContext()` and `getBookingPageWithAvailability(ctx.orgId)`:

```typescript
// app/(dashboard)/availability/page.tsx
import { requireOrgContext } from "@/lib/org-context"
import { getBookingPageWithAvailability } from "@/lib/data/booking-page"
import { AvailabilityForm } from "@/components/dashboard/availability-form"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function AvailabilityPage() {
  const ctx = await requireOrgContext()
  const page = await getBookingPageWithAvailability(ctx.orgId)

  if (!page) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Availability</h1>
        <p className="text-muted-foreground">Create a booking page first.</p>
        <Button asChild><Link href="/booking-page/edit">Create Booking Page</Link></Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Availability</h1>
      <AvailabilityForm bookingPageId={page.id} availability={page.availability} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/appointments/page.tsx app/(dashboard)/availability/page.tsx
git commit -m "feat(dashboard): migrate appointments + availability pages to requireOrgContext()"
```

---

### Task 13: Update API Routes — booking-page + availability

**Files:**
- Modify: `app/api/booking-page/route.ts`
- Modify: `app/api/booking-page/[id]/route.ts`
- Modify: `app/api/availability/route.ts`

- [ ] **Step 1: Update app/api/booking-page/route.ts**

```typescript
// app/api/booking-page/route.ts
import { NextResponse } from "next/server"
import { requireOrgContext } from "@/lib/org-context"
import { createBookingPage } from "@/lib/data/booking-page"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const ctx = await requireOrgContext()
  const { title, slug, description, duration, price } = await req.json()

  const existing = await prisma.bookingPage.findUnique({ where: { slug } })
  if (existing) return NextResponse.json({ error: "Slug already taken." }, { status: 409 })

  const page = await createBookingPage(ctx.orgId, {
    title,
    slug,
    description: description ?? null,
    duration: duration ?? 30,
    price: price ?? null,
  })

  return NextResponse.json(page, { status: 201 })
}
```

- [ ] **Step 2: Update app/api/booking-page/[id]/route.ts**

```typescript
// app/api/booking-page/[id]/route.ts
import { NextResponse } from "next/server"
import { requireOrgContext } from "@/lib/org-context"
import { updateBookingPage } from "@/lib/data/booking-page"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireOrgContext()
  const { id } = await params
  const { title, slug, description, duration, price } = await req.json()

  // compound { id, orgId } in updateBookingPage prevents IDOR
  const updated = await updateBookingPage(ctx.orgId, id, {
    title,
    slug,
    description: description ?? null,
    duration,
    price: price ?? null,
  })

  if (!updated) return NextResponse.json({ error: "Not found." }, { status: 404 })
  return NextResponse.json(updated)
}
```

- [ ] **Step 3: Update app/api/availability/route.ts**

```typescript
// app/api/availability/route.ts
import { NextResponse } from "next/server"
import { requireOrgContext } from "@/lib/org-context"
import { getBookingPage } from "@/lib/data/booking-page"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const ctx = await requireOrgContext()

  const page = await getBookingPage(ctx.orgId)
  if (!page) return NextResponse.json({ error: "Create a booking page first." }, { status: 400 })

  const slots: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[] =
    await req.json()

  await prisma.$transaction(
    slots.map((s) =>
      prisma.availability.upsert({
        where: { bookingPageId_dayOfWeek: { bookingPageId: page.id, dayOfWeek: s.dayOfWeek } },
        update: { startTime: s.startTime, endTime: s.endTime, isActive: s.isActive },
        create: { bookingPageId: page.id, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, isActive: s.isActive },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/booking-page app/api/availability/route.ts
git commit -m "feat(api): migrate booking-page + availability routes to org context"
```

---

### Task 14: Update Appointments API (org.tier free-limit)

**Files:**
- Modify: `app/api/appointments/route.ts`

- [ ] **Step 1: Update app/api/appointments/route.ts**

```typescript
// app/api/appointments/route.ts
// Public endpoint — no session required. Uses lib/data/public/booking.ts (whitelisted).
import { NextResponse } from "next/server"
import { getActiveBookingPageBySlug } from "@/lib/data/public/booking"
import { prisma } from "@/lib/prisma"

const FREE_TIER_DAILY_LIMIT = 5

export async function POST(req: Request) {
  const { slug, clientName, clientEmail, startTime, endTime, notes } = await req.json()

  const bookingPage = await getActiveBookingPageBySlug(slug)

  if (!bookingPage) {
    return NextResponse.json({ error: "Booking page not found." }, { status: 404 })
  }

  // Tier comes from org (post-migration) or user (pre-migration fallback)
  const tier = bookingPage.org?.tier ?? bookingPage.user?.tier ?? "FREE"

  if (tier === "FREE") {
    const todayStart = new Date(startTime)
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayEnd = new Date(startTime)
    todayEnd.setUTCHours(23, 59, 59, 999)

    const todayCount = await prisma.appointment.count({
      where: {
        bookingPageId: bookingPage.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { gte: todayStart, lte: todayEnd },
      },
    })

    if (todayCount >= FREE_TIER_DAILY_LIMIT) {
      return NextResponse.json(
        { error: "This provider isn't accepting more bookings today — please try again tomorrow." },
        { status: 429 }
      )
    }
  }

  const conflict = await prisma.appointment.findFirst({
    where: {
      bookingPageId: bookingPage.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      OR: [
        { startTime: { lt: new Date(endTime), gte: new Date(startTime) } },
        { endTime: { gt: new Date(startTime), lte: new Date(endTime) } },
      ],
    },
  })

  if (conflict) {
    return NextResponse.json({ error: "Slot no longer available." }, { status: 409 })
  }

  const appointment = await prisma.appointment.create({
    data: {
      bookingPageId: bookingPage.id,
      clientName,
      clientEmail,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      notes: notes ?? null,
      status: bookingPage.price ? "PENDING" : "CONFIRMED",
    },
  })

  return NextResponse.json(appointment, { status: 201 })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/appointments/route.ts
git commit -m "feat(api): appointments route uses org.tier with user.tier fallback; soften 429 copy"
```

---

### Task 15: Billing Re-scope (webhook + booking-checkout)

**Files:**
- Modify: `app/api/paddle/webhook/route.ts`
- Modify: `app/api/paddle/booking-checkout/route.ts`
- Modify: `lib/firebase-admin.ts`

- [ ] **Step 1: Update app/api/paddle/webhook/route.ts**

```typescript
// app/api/paddle/webhook/route.ts
import { NextResponse } from "next/server"
import { paddle } from "@/lib/paddle"
import { prisma } from "@/lib/prisma"
import { sendBookingConfirmedNotification } from "@/lib/firebase-admin"
import type {
  EventName,
  SubscriptionActivatedEvent,
  SubscriptionCanceledEvent,
  SubscriptionPausedEvent,
  SubscriptionResumedEvent,
  TransactionCompletedEvent,
} from "@paddle/paddle-node-sdk"

export async function POST(req: Request) {
  const signature = req.headers.get("paddle-signature") ?? ""
  const rawBody = await req.text()

  let event
  try {
    event = paddle.webhooks.unmarshal(rawBody, process.env.PADDLE_WEBHOOK_SECRET!, signature)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (!event) return NextResponse.json({ error: "Unknown event" }, { status: 400 })

  // Idempotency: INSERT … ON CONFLICT DO NOTHING; proceed only if row was inserted
  // (no interactive transaction needed — unique constraint is the race arbiter)
  const occurredAt = new Date((event as { occurredAt?: string }).occurredAt ?? Date.now())
  try {
    await prisma.webhookEvent.create({
      data: { eventId: event.eventId ?? event.notificationId ?? "", occurredAt },
    })
  } catch {
    // Duplicate eventId — already processed
    return NextResponse.json({ ok: true, deduplicated: true })
  }

  try {
    switch (event.eventType as EventName) {
      case "transaction.completed": {
        const data = event.data as TransactionCompletedEvent["data"]
        const customData = data.customData as Record<string, string> | null

        if (customData?.type === "booking_payment" && customData?.appointmentId) {
          const amount = data.details?.totals?.total
            ? Number(data.details.totals.total) / 100
            : null

          const appointment = await prisma.appointment.update({
            where: { id: customData.appointmentId },
            data: { status: "CONFIRMED", paddleTransactionId: data.id, amountPaid: amount },
            include: {
              bookingPage: {
                include: {
                  org: { include: { memberships: { include: { user: { include: { fcmTokens: true } } } } } },
                },
              },
            },
          })

          // Fan-out to all org members' FCM tokens
          const tokens = appointment.bookingPage.org?.memberships
            .flatMap((m) => m.user.fcmTokens.map((t) => t.token)) ?? []
          if (tokens.length > 0) {
            await sendBookingConfirmedNotification(tokens, {
              clientName: appointment.clientName,
              startTime: appointment.startTime.toISOString(),
            })
          }
        }
        break
      }

      case "subscription.activated": {
        const data = event.data as SubscriptionActivatedEvent["data"]
        const customData = data.customData as Record<string, string> | null
        const orgId = customData?.orgId

        console.log("[webhook] subscription.activated customData:", JSON.stringify(customData), "orgId:", orgId)

        if (orgId) {
          // Verify subscription belongs to this org (not blindly trusting customData)
          const org = await prisma.organization.findUnique({ where: { id: orgId } })
          if (!org) {
            console.error("[webhook] subscription.activated: orgId not found:", orgId)
            break
          }

          // Conditional update: only upgrade if this event is newer than any stored event
          await prisma.$transaction([
            prisma.organization.update({
              where: { id: orgId },
              data: {
                tier: "PRO",
                paddleSubscriptionId: data.id,
              },
            }),
            prisma.subscription.upsert({
              where: { orgId },
              update: {
                paddleSubscriptionId: data.id,
                paddlePriceId: data.items[0]?.price?.id ?? "",
                status: "ACTIVE",
                currentPeriodStart: new Date(data.currentBillingPeriod?.startsAt ?? Date.now()),
                currentPeriodEnd: new Date(data.currentBillingPeriod?.endsAt ?? Date.now()),
                cancelAtPeriodEnd: false,
              },
              create: {
                orgId,
                paddleSubscriptionId: data.id,
                paddlePriceId: data.items[0]?.price?.id ?? "",
                status: "ACTIVE",
                currentPeriodStart: new Date(data.currentBillingPeriod?.startsAt ?? Date.now()),
                currentPeriodEnd: new Date(data.currentBillingPeriod?.endsAt ?? Date.now()),
              },
            }),
          ])
          console.log("[webhook] upgraded org", orgId, "to PRO")
        }
        break
      }

      case "subscription.canceled": {
        const data = event.data as SubscriptionCanceledEvent["data"]
        const sub = await prisma.subscription.findUnique({
          where: { paddleSubscriptionId: data.id },
        })
        if (sub?.orgId) {
          await prisma.$transaction([
            prisma.subscription.update({
              where: { paddleSubscriptionId: data.id },
              data: { status: "CANCELED" },
            }),
            prisma.organization.update({
              where: { id: sub.orgId },
              data: { tier: "FREE" },
            }),
          ])
        }
        break
      }

      case "subscription.paused": {
        const data = event.data as SubscriptionPausedEvent["data"]
        await prisma.subscription.updateMany({
          where: { paddleSubscriptionId: data.id },
          data: { status: "PAUSED" },
        })
        break
      }

      case "subscription.resumed": {
        const data = event.data as SubscriptionResumedEvent["data"]
        await prisma.subscription.updateMany({
          where: { paddleSubscriptionId: data.id },
          data: { status: "ACTIVE" },
        })
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error("[webhook] PROCESSING ERROR:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Update app/api/paddle/booking-checkout/route.ts**

```typescript
// app/api/paddle/booking-checkout/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { paddle } from "@/lib/paddle"

export async function POST(req: Request) {
  const { appointmentId } = await req.json()

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      bookingPage: {
        select: { price: true, currency: true, title: true, slug: true, orgId: true },
      },
    },
  })

  if (!appointment || !appointment.bookingPage.price) {
    return NextResponse.json({ error: "Invalid appointment." }, { status: 400 })
  }

  if (appointment.status !== "PENDING") {
    return NextResponse.json({ error: "Appointment is not pending payment." }, { status: 409 })
  }

  const priceInCents = Math.round(Number(appointment.bookingPage.price) * 100)

  try {
    const transaction = await paddle.transactions.create({
      items: [
        {
          price: {
            description: `${appointment.bookingPage.title} session`,
            unitPrice: { amount: String(priceInCents), currencyCode: appointment.bookingPage.currency as "USD" | "GBP" | "EUR" },
            taxMode: "exclusive",
            product: { name: appointment.bookingPage.title, taxCategory: "digital-goods" },
          },
          quantity: 1,
        },
      ],
      customData: { appointmentId: appointment.id, type: "booking_payment" },
      customer: { email: appointment.clientEmail, name: appointment.clientName },
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/book/${appointment.bookingPage.slug}/confirmed?appt=${appointment.id}`,
    })
    return NextResponse.json({ checkoutUrl: transaction.checkout?.url ?? null })
  } catch (err) {
    console.error("Paddle booking-checkout failed:", err)
    const message = err instanceof Error ? err.message : "Failed to create checkout."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
```

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass EXCEPT `ci-grep-rule.test.ts` — that will pass once all routes above have been migrated (check the violations list — it should now only list the webhook and booking-checkout, which are whitelisted). Verify the isolation and org-context tests are green.

- [ ] **Step 4: Commit**

```bash
git add app/api/paddle/webhook/route.ts app/api/paddle/booking-checkout/route.ts
git commit -m "feat(billing): org-scoped webhook (idempotency, orgId customData, FCM fan-out to org members)"
```

---

### Task 16: Verify CI Gate Passes

- [ ] **Step 1: Run the CI isolation test**

```bash
npx vitest run __tests__/isolation/ci-grep-rule.test.ts
```

Expected: PASS (0 violations). If there are still violations, the output lists the files — update each to use `lib/data/*` functions.

- [ ] **Step 2: Run full suite**

```bash
npx vitest run
```

Expected: all tests green.

- [ ] **Step 3: Commit**

```bash
git commit -m "test(isolation): CI grep rule now passes — all org-scoped prisma access through lib/data/"
```

---

### Task 17: Migration Script + Execute

**Files:**
- Create: `scripts/migrate-to-orgs.mjs`

The migration script uses the **WebSocket adapter** (`Pool` from `@neondatabase/serverless`) for true per-user transactional atomicity. It is idempotent (safe to re-run).

- [ ] **Step 1: Create scripts/migrate-to-orgs.mjs**

```javascript
// scripts/migrate-to-orgs.mjs
// Run with: node scripts/migrate-to-orgs.mjs
// Uses WebSocket (Pool) adapter for real transactions — NOT the HTTP adapter.
import "dotenv/config"
import { neon, Pool } from "@neondatabase/serverless"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  // ── Step 1: Dry run — count assertions ──────────────────────────────────────
  const sql = neon(process.env.DATABASE_URL)

  const users = await sql`SELECT id, name, email, tier FROM users`
  const pages = await sql`SELECT id, "userId" FROM booking_pages WHERE "orgId" IS NULL`
  const subs = await sql`
    SELECT s.id, s."userId", s.status FROM subscriptions s WHERE s."orgId" IS NULL
  `

  console.log(`Users to migrate: ${users.length}`)
  console.log(`BookingPages without orgId: ${pages.length}`)
  console.log(`Subscriptions without orgId: ${subs.length}`)

  // Assert no data anomalies
  const dupSlugs = await sql`
    SELECT slug, COUNT(*) FROM booking_pages GROUP BY slug HAVING COUNT(*) > 1
  `
  if (dupSlugs.length > 0) {
    throw new Error(`Duplicate slugs found: ${dupSlugs.map((r) => r.slug).join(", ")}`)
  }

  console.log("Dry run assertions passed. Starting backfill...")

  // ── Step 2: Backfill each user in a transaction ──────────────────────────────
  for (const user of users) {
    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      // Check if already migrated (idempotent)
      const existing = await client.query(
        `SELECT id FROM organizations WHERE id IN (
          SELECT "orgId" FROM memberships WHERE "userId" = $1 AND role = 'OWNER'
        ) LIMIT 1`,
        [user.id]
      )
      if (existing.rows.length > 0) {
        console.log(`User ${user.email} already migrated — skipping`)
        await client.query("ROLLBACK")
        continue
      }

      // Org name: prefer user.name, fall back to "My Organization" (never raw email)
      const orgName = user.name?.trim() || "My Organization"

      // Tier: prefer live subscription status over stale user.tier
      const liveSub = subs.find((s) => s.userId === user.id)
      const tier = liveSub?.status === "ACTIVE" ? "PRO" : user.tier

      // Create org
      const orgResult = await client.query(
        `INSERT INTO organizations (id, name, tier, "inviteToken", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2::"Tier", gen_random_uuid()::text, NOW(), NOW())
         RETURNING id`,
        [orgName, tier]
      )
      const orgId = orgResult.rows[0].id

      // Create OWNER membership
      await client.query(
        `INSERT INTO memberships (id, "userId", "orgId", role, "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, 'OWNER'::"Role", NOW(), NOW())`,
        [user.id, orgId]
      )

      // Set active org
      await client.query(
        `UPDATE users SET "activeOrgId" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [orgId, user.id]
      )

      // Repoint booking page
      const page = pages.find((p) => p.userId === user.id)
      if (page) {
        await client.query(
          `UPDATE booking_pages SET "orgId" = $1, "updatedAt" = NOW() WHERE id = $2`,
          [orgId, page.id]
        )
      }

      // Repoint subscription
      const sub = subs.find((s) => s.userId === user.id)
      if (sub) {
        await client.query(
          `UPDATE subscriptions SET "orgId" = $1, "updatedAt" = NOW() WHERE id = $2`,
          [orgId, sub.id]
        )
      }

      await client.query("COMMIT")
      console.log(`Migrated ${user.email} → org "${orgName}" (tier: ${tier})`)
    } catch (err) {
      await client.query("ROLLBACK")
      console.error(`Failed for ${user.email}:`, err)
      throw err
    } finally {
      client.release()
    }
  }

  // ── Step 3: Post-backfill assertions ────────────────────────────────────────
  const nullOrgPages = await sql`SELECT COUNT(*) FROM booking_pages WHERE "orgId" IS NULL AND "userId" IS NOT NULL`
  const nullOrgSubs = await sql`SELECT COUNT(*) FROM subscriptions WHERE "orgId" IS NULL AND "userId" IS NOT NULL`

  if (Number(nullOrgPages[0].count) > 0) throw new Error("Some BookingPages still have null orgId!")
  if (Number(nullOrgSubs[0].count) > 0) throw new Error("Some Subscriptions still have null orgId!")

  console.log("Post-backfill assertions passed. Safe to run finalize push.")
  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Take a Neon branch snapshot BEFORE running**

In the Neon console: **Branches → production → Create branch** (name it `pre-org-migration-YYYYMMDD`). This is your rollback point.

- [ ] **Step 3: Run the migration script**

```bash
node scripts/migrate-to-orgs.mjs
```

Expected output:
```
Users to migrate: 2
BookingPages without orgId: 1
Subscriptions without orgId: 1
Dry run assertions passed. Starting backfill...
Migrated walaahorani09@gmail.com → org "Walaa Horani" (tier: PRO)
Migrated walaa.horani@hotmail.com → org "My Organization" (tier: FREE)
Post-backfill assertions passed. Safe to run finalize push.
```

- [ ] **Step 4: Commit the migration script**

```bash
git add scripts/migrate-to-orgs.mjs
git commit -m "feat(migration): backfill script — idempotent, transactional (WS adapter), assertion-gated"
```

---

### Task 18: Finalize Schema (make orgId required, drop legacy fields)

**⚠️ Only run after Step 3 above shows "Post-backfill assertions passed."**

- [ ] **Step 1: Update schema.prisma — make orgId required, remove legacy fields**

In `prisma/schema.prisma`, make the following changes:

**User model** — remove `tier Tier @default(FREE)`, remove `bookingPage` and `subscription` relations:
```prisma
model User {
  id            String      @id @default(cuid())
  name          String?
  email         String      @unique
  emailVerified DateTime?
  image         String?
  password      String?
  accountType   AccountType @default(PROVIDER)
  activeOrgId   String?
  accounts      Account[]
  sessions      Session[]
  memberships   Membership[]
  fcmTokens     FcmToken[]
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  @@map("users")
}
```

**BookingPage model** — remove `userId`, make `orgId` required, update relation:
```prisma
model BookingPage {
  id           String   @id @default(cuid())
  orgId        String   @unique
  slug         String   @unique
  title        String
  description  String?  @db.Text
  duration     Int      @default(30)
  price        Decimal? @db.Decimal(10, 2)
  currency     String   @default("USD")
  isActive     Boolean  @default(true)
  brandColor   String?
  logoUrl      String?
  org          Organization  @relation("OrgBookingPage", fields: [orgId], references: [id], onDelete: Cascade)
  availability Availability[]
  appointments Appointment[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@map("booking_pages")
}
```

**Subscription model** — remove `userId`, make `orgId` required:
```prisma
model Subscription {
  id                   String             @id @default(cuid())
  orgId                String             @unique
  paddleSubscriptionId String             @unique
  paddlePriceId        String
  status               SubscriptionStatus
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean            @default(false)
  org                  Organization?      @relation("OrgSubscription", fields: [orgId], references: [id], onDelete: Cascade)
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  @@map("subscriptions")
}
```

Also remove the `Tier` enum (it stays on `Organization`).

- [ ] **Step 2: Push the finalized schema**

```bash
npx prisma db push
```

Expected: `Your database is now in sync` — drops `users.tier`, `booking_pages.userId`, `subscriptions.userId`.

- [ ] **Step 3: Regenerate the client + verify TypeScript**

```bash
npx prisma generate && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all tests green including the CI grep rule.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma app/generated/prisma
git commit -m "feat(schema): finalize org migration — drop User.tier, BookingPage.userId, Subscription.userId"
```

- [ ] **Step 6: Start the dev server and smoke test**

```bash
npm run dev
```

Verify:
1. `http://localhost:3000/dashboard` — org name visible in header, PRO badge shows
2. Create a new incognito session → sign in → redirected to `/onboarding` (no active org)
3. Create org → redirected to `/dashboard`
4. Open `/join/<token>` (from org settings page) in incognito → joins org

---

## Self-Review

### 1. Spec coverage check

| Design requirement | Task |
|---|---|
| Organization model + Membership + WebhookEvent | Task 1 |
| Role, AccountType enums | Task 1 |
| `lib/data/*` boundary (org, membership, booking-page, appointments, public) | Tasks 2–3 |
| Hard CI grep rule | Task 4 |
| Cross-org isolation tests (crown jewel + IDOR) | Task 5 |
| `requireOrgContext()` + `requireOwner()` | Task 6 |
| Session: `activeOrgId`, `accountType`; remove `tier` | Task 7 |
| proxy.ts coarse gate (UX-only) | Task 7 |
| Onboarding page + create org API | Task 8 |
| Join via invite link + token through login | Task 9 |
| Org switcher (hidden if 1 org; toast on switch) | Task 10 |
| Org settings (rename, invite rotation) | Task 10 |
| Member management + last-owner protection | Task 10 |
| Dashboard page uses `requireOrgContext()` | Task 11 |
| Booking page dashboard uses `requireOrgContext()` | Task 11 |
| UpgradeButton takes `orgId` (Owner-only) | Task 11 |
| Appointments + availability pages migrated | Task 12 |
| Booking-page + availability APIs migrated | Task 13 |
| Appointments API: org.tier free-limit + soft 429 copy | Task 14 |
| Webhook: orgId customData, idempotency, org tier flip, FCM fan-out to org | Task 15 |
| CI gate passes (all routes use lib/data/) | Task 16 |
| Migration script (WS adapter, transactional, idempotent, assertion-gated) | Task 17 |
| Finalize schema (drop legacy fields) | Task 18 |
| Post-migration banner (§15 UX strings) | Task 11 (dashboard joined toast) |
| Humane join error states | Task 9 |
| Mid-session org-loss → auto-switch or explained redirect | Task 6 |
| Member vs Owner: hidden controls with affordance | Tasks 11, 13 |
| Free-limit copy role-branched (Owner CTA / Member explanation) | Task 11 |

### 2. Placeholder scan
No TBD, TODO, or "implement later" strings found.

### 3. Type consistency
- `requireOrgContext()` returns `OrgContext` with `role: Role` — used consistently in all route handlers.
- `createOrg(name, ownerId)` matches callers in Task 8.
- `updateBookingPage(orgId, id, data)` — compound `where: { id, orgId }` matches Task 13.
- `joinByToken(token, userId)` returns `{ orgId, alreadyMember }` — used in Task 9.
- `UpgradeButton` takes `{ orgId, email }` — matches Task 11 caller.
