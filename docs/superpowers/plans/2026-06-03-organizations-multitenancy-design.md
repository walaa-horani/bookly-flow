# BooklyFlow Organizations / Multi-Tenancy — Design

**Status:** Design (pre-implementation). Awaiting multi-agent review.
**Date:** 2026-06-03
**Author:** design session (brainstorming skill)

---

## 1. Understanding Summary

- **What:** Convert BooklyFlow from single-tenant (each `User` *is* the provider) to **multi-tenant organizations**. An org owns the booking page, appointments, and subscription; provider users are members of orgs.
- **Membership:** A user can belong to **multiple orgs** and switches an **active org**; all dashboard data reflects the active org. Roles: **Owner** and **Member**.
- **Billing:** FREE/PRO tier + Paddle subscription live on the **Organization**. The whole org is FREE or PRO; the 5-bookings/day limit is per org; **only an Owner** can upgrade/manage billing.
- **Booking page:** Exactly **one per org**, public at `/book/[slug]`; PRO branding applies to the org's page.
- **Joining:** Owners generate a **shareable invite link** (`/join/<token>`); a logged-in user opening it joins as **Member**. No email infrastructure.
- **Gate:** A provider with **no active org** cannot reach `/dashboard` — routed to `/onboarding` (create org or open invite link).
- **Account types:** `User.accountType` ∈ {`PROVIDER`, `CLIENT`}. Only providers go through the org gate. The `CLIENT` surface (accounts for appointment-makers) is **deferred** but the discriminator exists now so the gate routes by type instead of forcing every login into an org.
- **Migration:** One-time backfill wraps each existing user in a new org (as Owner) and moves their booking page + tier/subscription into it (preserves current PRO + `code-review-session`).

## 2. Users of the system

| | Provider (business) | Client (appointment-maker) |
|---|---|---|
| Account | Yes — login + dashboard | **Accountless today** (deferred future logins) |
| In an org | Yes (Owner/Member) | Never |
| Surface | `/dashboard/*` (gated) | Public `/book/[slug]` (open) |
| Affected by this redesign | Yes | No |

## 3. Assumptions

- **Isolation is requirement #1.** Every data query is scoped to the active org id, **derived server-side** from session + verified membership — never from client input. Owner-only actions enforce role checks.
- Scale is small (early-stage): `orgId`-indexed queries; no sharding/HA/RLS.
- Active org persisted server-side as `User.activeOrgId`, resolved in the Auth.js session callback.
- A provider with zero orgs always lands on `/onboarding`.
- Booking-page slug stays globally unique.
- Invite link = single rotatable `inviteToken` per org; Owner can rotate to revoke. Expiry deferred (YAGNI).

## 4. Approach (chosen: A)

**Centralized org-context guard + scoped data access.** A single `requireOrgContext()` resolves session → active org → verifies membership → returns `{ userId, orgId, role, org }`. All org data flows through `lib/data/*` functions that *require* an `orgId`. Defense in depth: a page cannot read org data without proving membership.

Rejected:
- **B (raw inline scoping):** easiest, but a forgotten `where: { orgId }` = cross-org leak. Too risky for the #1 requirement.
- **C (Postgres RLS):** strongest DB guarantee, but fragile with Prisma 7 + Neon **HTTP** adapter over pooled serverless connections; high complexity.

## 5. Data Model

```prisma
model Organization {
  id           String   @id @default(cuid())
  name         String
  tier         Tier     @default(FREE)          // moved from User
  inviteToken  String   @unique @default(cuid()) // shareable link; Owner can rotate
  memberships  Membership[]
  bookingPage  BookingPage?
  subscription Subscription?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@map("organizations")
}

model Membership {
  id     String @id @default(cuid())
  userId String
  orgId  String
  role   Role   @default(MEMBER)
  user   User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  org    Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  @@unique([userId, orgId])
  @@index([orgId])
  @@map("memberships")
}

enum Role { OWNER  MEMBER }
enum AccountType { PROVIDER  CLIENT }
```

**Changed models**
- `User`: remove `tier`; add `accountType AccountType @default(PROVIDER)`, `activeOrgId String?`, `memberships Membership[]`. Drop direct `bookingPage`/`subscription` relations.
- `BookingPage`: `userId` → `orgId String @unique`.
- `Subscription`: `userId` → `orgId String @unique`.
- `Appointment`: unchanged (org-scoped via its `BookingPage`).
- `FcmToken`: stays on `User`; booking-confirmed push fans out to all org members.

## 6. Session, Guard, Gate

- **Session callback:** set `session.user.id`, `session.user.activeOrgId`; remove `tier`.
- **`requireOrgContext()`** (`lib/org-context.ts`): (1) no session → `/login`; (2) assert `accountType === PROVIDER`; (3) no `activeOrgId` → `/onboarding`; (4) verify membership (include org) — none → clear + `/onboarding`; (5) return `{ userId, orgId, role, org }`. `requireOwner()` wraps it for billing/invites/member-removal/delete.
- **Data layer** (`lib/data/*`): `getBookingPage(orgId)`, `listAppointments(orgId)`, etc. — orgId always required.
- **Two-layer gate:** `proxy.ts` coarse (session + `activeOrgId` present, no DB) for UX; `requireOrgContext()` authoritative per request.

## 7. Onboarding / Join / Switcher

- **`/onboarding`** (provider, no active org): Create org (name → Organization + Membership(OWNER) + activeOrgId → `/dashboard`) OR open an invite link.
- **`/join/<token>`** (server action): requires login; find org by `inviteToken`; create `Membership(MEMBER)` if absent; set `activeOrgId`; → `/dashboard`.
- **Org switcher** (header): dropdown of memberships; selecting sets `User.activeOrgId` + revalidates.

## 8. Billing & Paddle (org-scoped)

- `UpgradeButton`: `customData: { orgId, type: "subscription_upgrade" }`; visible only to Owner of a FREE org.
- Webhook `subscription.activated`: read `customData.orgId`; `org.tier = PRO`; upsert `Subscription` by `orgId`.
- Webhook `subscription.canceled`: org `tier = FREE`.
- Webhook `transaction.completed` (booking_payment): FCM fan-out to all org members.
- `/api/appointments` free-tier limit: read decision from `org.tier` (count already per page = per org).
- Dashboard tier badge/gating from `requireOrgContext().org.tier`.
- `lib/paddle.ts` `Environment.sandbox` fix unchanged.

## 9. Migration (multi-step, `prisma db push`)

1. **Additive push:** add `Organization`, `Membership`, `Role`, `AccountType`, `accountType`, `activeOrgId`, `Organization.tier`, nullable `orgId` on `BookingPage`/`Subscription`.
2. **Backfill script:** per existing `User` → create `Organization` (name from name/email), `Membership(OWNER)`, set `activeOrgId`, set `org.tier` from user's current tier, repoint `BookingPage`/`Subscription` to `orgId`.
3. **Finalizing push:** make `orgId` required + unique; drop `User.tier` and old `userId` FKs.

## 10. Testing Strategy (TDD / Vitest)

- `requireOrgContext()` unit tests (no session, no activeOrg, stale activeOrg, valid member, non-provider, owner-vs-member).
- **Cross-org isolation tests (crown jewel):** Org A member can never read Org B's booking page/appointments, even when B's `orgId` is supplied directly; data-layer refuses non-members.
- Join/invite (valid/invalid/rotated token); switcher (member vs non-member).
- Billing webhook (activated → PRO org; canceled → FREE org).
- Free-tier limit per org.
- Migration script against a seeded snapshot.

## 11. Decision Log

| Decision | Alternatives | Why |
|---|---|---|
| Team orgs, multi-org per user, active-org switcher | Solo; one-org-per-user | User intent: clinics/agencies with teams; switching like Slack |
| Roles: Owner + Member | Owner/Admin/Member; flat | Protects billing/members without over-granular checks |
| Org-level billing/tier | Per-user | Standard B2B; one plan governs the shared page |
| One booking page per org | Many per org | Matches today; simplest |
| Shareable invite link | Email invite; in-app pending; link; defer | No email infra; simple |
| Isolation via `requireOrgContext()` + orgId data layer (Approach A) | Inline scoping (B); RLS (C) | Strong + fits Prisma7/Neon HTTP serverless |
| Active org → `User.activeOrgId` (session callback) | Cookie; Session row | Single source of truth; survives reloads |
| Invite token → single rotatable per org | Per-invite table; single-use/expiry | YAGNI; rotate to revoke |
| `accountType` discriminator now, client surface later | Build both; ignore clients | Keeps gate future-proof without scope blow-up |
| Migrate existing data | Reset dev data | Preserve PRO + booking page |

## 12. Open Questions (resolved-by-default unless raised)

1. Invite-link security: reusable + Owner-rotatable (chosen). Single-use/expiry deferred.
2. Active-org storage: `User.activeOrgId` (chosen).
3. Edge cases to handle in plan: last-Owner protection (can't leave/demote if sole Owner); deleting an org cascades memberships/page/subscription; rotating token invalidates old link.

---

## 13. Review Round 1 — Skeptic (dispositions + revisions)

**Accepted → design revised:**

- **(1, 10) Live membership, never trust the session field.** `requireOrgContext()` treats `session.user.activeOrgId` as a *hint only*. On **every** request it re-queries `Membership` for `(userId, activeOrgId)`; role/tier come from that live row. If absent → clear + `/onboarding`. The **switcher write** independently re-verifies membership before setting `activeOrgId`. Kills the TOCTOU/removed-member window.
- **(2) Convert convention → enforcement.** Add a **Prisma client extension** that, for org-scoped models (`BookingPage`, `Subscription`, `Appointment`, `Membership`, `Organization`), requires an explicit `orgId` in the `where` of reads/writes and throws if missing. The `lib/data/*` layer is the only sanctioned caller. CI grep-rule flags raw `prisma.<orgModel>` use outside `lib/data/`. Approach A now has a structural guard, not just a convention.
- **(3) Scope id-addressed mutations in the query itself.** All `[id]` routes use `where: { id, orgId }` (compound) so a foreign id simply matches nothing — no fetch-then-compare. Isolation tests cover this IDOR path explicitly.
- **(4, 5) Webhook hardening.** Store `paddleCustomerId`/`paddleSubscriptionId` on `Organization`; on `subscription.*` verify the event's subscription/customer maps to the claimed `orgId` (not blindly trust `customData.orgId`). Add an **idempotency table** keyed by Paddle `event_id`; ignore stale events via `occurred_at` ordering. Prevents replay, cross-org tier flips, and downgrade races.
- **(8, 9) Safe migration.** Create a **Neon branch snapshot** before any change (rollback path). Backfill runs as a **dry-run with count assertions first** (every `BookingPage`/`Subscription` gets an `orgId`; no nulls/dupes; `User.name` null → org name "My Organization"; tier reconciled from live `Subscription.status` over stale `User.tier`). Finalizing push (NOT NULL/UNIQUE + drops) runs **only after** assertions pass.
- **(7) `proxy.ts` is UX-only, never security.** Documented in code: the authoritative boundary is `requireOrgContext()`. Proxy must never be cited as an isolation control.
- **(14) Session shape transition.** All `session.user.tier` reads migrate to `requireOrgContext().org.tier`; access is null-safe so in-flight pre-migration sessions degrade to FREE, not crash. `upgrade-button` takes `orgId`.
- **(11) Invite token tightened.** Still one rotatable token per org, but add **enable/disable + optional expiry** (Members can read client PII, so a perpetual link is too loose). Not full per-invite tracking (still YAGNI), but revocable and expirable.
- **(13) FCM fan-out — accepted within-org exposure, documented.** Team members all get booking pushes (intended for a shared org); noted as a deliberate within-org privacy choice, revisitable later.

**Rejected (with rationale):**

- **(6) Public booking surface "leaks."** *Rejected as a scope error.* The public `/book/[slug]` page is **public by intent** — providers want it discoverable. Isolation requirement = **private/dashboard** data across orgs, not the intentionally-public booking page. Mitigation kept: soften the 429 so it doesn't advertise a competitor's daily-limit state. Boundary clarified in §2.
- **(12) `accountType` is YAGNI.** *Rejected.* The user explicitly chose "design the gate to allow clients later." It's a cheap discriminator that prevents a painful gate rework. Mitigation: the `PROVIDER` branch is covered by tests so it can't rot.

**New schema deltas from this round:** `Organization.paddleCustomerId String?`, `Organization.paddleSubscriptionId String?`, invite token `inviteTokenEnabled Boolean`, `inviteTokenExpiresAt DateTime?`; new `WebhookEvent { eventId @unique, occurredAt, processedAt }` idempotency table.

---

## 14. Review Round 2 — Constraint Guardian (dispositions + revisions)

**Hard stack constraint absorbed (underlies everything below):** the **Neon HTTP adapter (`PrismaNeonHttp`) does not support interactive transactions** — `prisma.$transaction(async tx => …)` throws at runtime. Only the **array/batch form** `$transaction([...])` (one batched request) works; true multi-statement atomicity requires the **WebSocket adapter** (`PrismaNeon`/`Pool`) or `ON CONFLICT` single statements. (Note: the existing webhook already uses the supported array form — good.)

**Accepted → design revised:**

- **(1, 5) Drop the runtime throwing `$extends` guard.** It would hard-break the public `/book/[slug]` + webhook paths (which legitimately query `Appointment`/`BookingPage`/`Availability` with **no orgId/session**), and it duplicates the data-layer boundary. **Primary enforcement = `lib/data/*` boundary + CI grep-rule** flagging raw `prisma.<orgModel>` outside `lib/data/`. Public/webhook queries live in an explicitly sanctioned `lib/data/public/*` (and webhook handlers) that the rule whitelists. Cheaper, proportionate, and no public-path breakage.
- **(2) Live membership lookup = one round-trip.** `requireOrgContext()` uses `membership.findUnique({ where: { userId_orgId: {…} }, include: { org: true } })` — single Neon HTTP call returning role + org(tier). Negligible at current scale; compound unique + `@@index([orgId])` adequate.
- **(3) Webhook idempotency without interactive tx.** Atomic gate = `INSERT INTO webhook_events(eventId) … ON CONFLICT DO NOTHING`; proceed only if a row was inserted (affected-count check) — the unique `eventId` is the race arbiter, no transaction needed. Out-of-order handling = conditional tier update gated on stored `occurredAt` (`… WHERE occurredAt < :incoming` semantics) so stale `activated`/`canceled` retries are no-ops. Multi-row needs use the **array** `$transaction([...])`, never the callback form.
- **(4) Backfill atomicity.** Run the backfill as a **standalone Node script using the WebSocket adapter** (`PrismaNeon`/`Pool`, which supports transactions) so each per-user unit (create Org + Membership + repoint page/subscription) is transactional — **and** make it idempotent/re-runnable (`ON CONFLICT DO NOTHING`) as belt-and-suspenders. Keep the Neon-branch snapshot + count-assertion gate before the finalize push. Finalize DDL (NOT NULL/UNIQUE/drop) is safe over HTTP as single statements once assertions pass.
- **(5) Defer invite-token expiry/disable.** Reverses the Skeptic-round addition: at sandbox scale with no real members, ship **only the rotatable token** (rotation already gives revocation). Re-introduce enable/disable + expiry at the "real members" milestone.

**Net effect on schema deltas:** keep `Organization.paddleCustomerId`/`paddleSubscriptionId` and `WebhookEvent`; **drop** `inviteTokenEnabled`/`inviteTokenExpiresAt` for now; **no** runtime Prisma extension.

**Verdicts:** no BLOCKERs remain once the no-interactive-transaction reality is honored in the webhook + backfill. All others ACCEPTABLE/CONCERN resolved above.

---

## 15. Review Round 3 — User Advocate (dispositions)

**All 10 findings accepted** (copy/defaults/error-states; no architecture change). Consolidated into a required **UX Strings & Redirect-Reason Appendix** — every forced redirect/gate transition must carry a human explanation, never drop the user on a context-free screen:

- **Onboarding (1, 10):** "Create your organization" is the single primary, pre-focused action with one-line rationale ("Your booking page and team live in an organization"). Invite path demoted to helper text ("Got an invite link? Just open it."). No "active org"/"context" jargon in UI.
- **Post-migration (2):** org name defaults to `User.name`; fall back to "My Organization" only if null — **never** the raw email. One-time dismissible banner: "We grouped your booking page and plan into an organization you can share with a team. Rename it in settings."
- **Join via link (3, 4):** `/join/<token>` **preserves the token through login** (callbackUrl) and auto-completes on return; login shows "Log in to join [Org]". Outcomes: already-member → switch + toast "You're already in [Org]"; invalid/rotated → friendly "This invite link is no longer active — ask the owner for a new one" (not 404/500); success → "You joined [Org]"; join screen shows "Joining as you@email — wrong account? Switch."
- **Mid-session org loss (5):** if the user has **other** memberships → auto-switch + toast (don't bounce). If none → `/onboarding` with reason: "You no longer have access to that organization."
- **Switcher (6):** hidden/static label when the user has exactly one org; on switch, toast "Now viewing [Org]"; org name always visible in header as persistent context.
- **Member vs Owner (7):** Owner-only controls are **hidden** for Members, with one explanatory affordance per gated area (e.g. billing shows "Only the organization owner can change the plan") — never a dead/disabled button.
- **Free-limit copy, role-branched (8):** Owner → upgrade CTA; Member → "Your organization has reached today's free booking limit. Ask your owner to upgrade." (no upgrade button for Members).
- **Public 429 (9):** customer-facing, rendered as a normal page state: "This provider isn't accepting more bookings today — please try again tomorrow." Never exposes tier/limit internals.

**Decision Log addition:** UX copy + redirect reasons are a first-class deliverable of the plan, not an afterthought; isolation redirects must be explained, not silent.

---

## 16. Phase 3 — Arbiter: FINAL DISPOSITION

**DISPOSITION: APPROVED.** All reviewer objections resolved or soundly rejected; the two Skeptic rejections (#6 public surface, #12 `accountType`) upheld; the Neon no-interactive-transaction constraint honored in webhook idempotency and migration backfill; exit criteria met (understanding lock, all reviewers invoked, decision log complete). Residual risk: isolation now rests on the `lib/data` boundary + CI grep-rule rather than a runtime guard — this must be enforced as a hard CI gate, not prose.

**Mandatory implementation preconditions (non-negotiable — the plan MUST encode these):**

1. **Hard CI isolation gate.** The grep-rule flagging raw `prisma.<orgModel>` access outside `lib/data/` (whitelisting `lib/data/public/*` + webhook handlers) is a **hard CI failure**, committed with the first schema change, alongside the crown-jewel cross-org isolation tests (§10) — including the IDOR `where: { id, orgId }` path — green before any data-layer code merges.
2. **Live membership, hint-only session.** `requireOrgContext()` treats `activeOrgId` as a hint and re-verifies membership live every request (role/tier from the live row); the switcher write re-verifies before setting `activeOrgId`.
3. **Snapshot + assertions gate the destructive finalize.** Neon-branch snapshot exists; dry-run count assertions (no null/dup `orgId`; tier reconciled from live `Subscription.status`; null name → "My Organization") pass before the NOT NULL/UNIQUE/drop push. Backfill runs on the WebSocket adapter and is idempotent.
4. **Webhook trust + idempotency.** Verify the event's subscription/customer maps to the claimed `customData.orgId`; gate on `WebhookEvent.eventId` insert affected-count; order via `occurredAt`. **No callback-form `$transaction` in any Neon-HTTP path.**
5. **Explained transitions + humane gating.** Every forced redirect carries a human reason (§15); Owner-only controls are hidden-with-affordance for Members, never dead buttons.

**Status:** Design APPROVED for implementation planning, conditioned on the 5 preconditions above.
