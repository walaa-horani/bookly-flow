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
