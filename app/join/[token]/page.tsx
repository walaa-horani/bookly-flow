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
