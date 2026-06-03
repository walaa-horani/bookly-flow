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
