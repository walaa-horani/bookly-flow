// app/(dashboard)/org/settings/page.tsx
import { requireOrgContext } from "@/lib/org-context"
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
