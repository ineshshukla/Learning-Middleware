import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import Script from "next/script"
import { ThemeProvider } from "@/components/theme-provider"

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-signin-client_id" content={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID} />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background dark:bg-gradient-to-br dark:from-violet-50 dark:via-white dark:to-emerald-50/20">{children}</div>
        </ThemeProvider>
        <Script src="https://accounts.google.com/gsi/client" async defer />
      </body>
    </html>
  )
}
