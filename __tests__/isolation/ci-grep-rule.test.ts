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
