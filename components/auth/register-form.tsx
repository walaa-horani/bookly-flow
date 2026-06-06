"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Briefcase, ChevronLeft } from "lucide-react"

export function RegisterForm() {
  const router = useRouter()
  const [accountType, setAccountType] = useState<"CLIENT" | "PROVIDER" | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, accountType }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? "Registration failed.")
      return
    }

    router.push("/login?registered=1")
  }

  if (accountType === null) {
    return (
      <div className="flex flex-col items-center gap-6 max-w-2xl w-full px-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Join BooklyFlow</h1>
          <p className="text-muted-foreground">Select your account type to get started</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <Card 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between group border-2 border-transparent hover:bg-muted/10"
            onClick={() => setAccountType("CLIENT")}
          >
            <CardHeader className="space-y-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                <User className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">Become a Client</CardTitle>
              <CardDescription>
                Find verified organizations, view real-time availability, and book appointments easily.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-6 mt-auto">
              <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                Register as Client
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between group border-2 border-transparent hover:bg-muted/10"
            onClick={() => setAccountType("PROVIDER")}
          >
            <CardHeader className="space-y-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                <Briefcase className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">Become a Provider</CardTitle>
              <CardDescription>
                Set up your organization, customize booking pages, manage schedules, and accept bookings.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-6 mt-auto">
              <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                Register as Provider
              </Button>
            </CardContent>
          </Card>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Already have an account?{" "}
          <a href="/login" className="underline hover:text-foreground">
            Sign in
          </a>
        </p>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="relative">
        <button 
          onClick={() => { setAccountType(null); setError(null); }}
          className="absolute left-4 top-4 text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          type="button"
        >
          <ChevronLeft className="h-3 w-3" />
          <span>Back</span>
        </button>
        <CardTitle className="pt-4">Create your account</CardTitle>
        <CardDescription>
          Signing up as a {accountType === "CLIENT" ? "Client" : "Provider"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="underline">Sign in</a>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
