import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import Script from "next/script"

export const metadata: Metadata = {
  title: "Learning Middleware",
  description: "Create, manage, and deliver exceptional educational content",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="google-signin-client_id" content={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID} />
      </head>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-emerald-50/20">{children}</div>
        <Script src="https://accounts.google.com/gsi/client" async defer />
      </body>
    </html>
  )
}
