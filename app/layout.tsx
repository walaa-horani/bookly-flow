import type { Metadata } from "next"
import { Roboto, JetBrains_Mono } from "next/font/google"
import { SessionProvider } from "next-auth/react"
import "./globals.css"

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
})
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "BooklyFlow",
  description: "Appointment Booking SaaS",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className={`${roboto.variable} ${jetbrainsMono.variable} antialiased font-sans`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
