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

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*"],
}
