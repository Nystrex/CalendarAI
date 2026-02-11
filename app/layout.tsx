import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { ThemeInitializer } from "@/components/theme-initializer"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CalendarAI - Modern Schedule Management",
  description: "Manage your schedule with powerful integrations and intelligent AI features. CalendarAI helps you organize events, extract tasks from text, and stay productive.",
  generator: "v0.app",
  openGraph: {
    title: "CalendarAI - Modern Schedule Management",
    description: "Manage your schedule with powerful integrations and intelligent AI features",
    url: "https://calendarai.dev",
    siteName: "CalendarAI",
  },
  icons: {
    icon: [{ url: "/icon.png" }, { url: "/logo.png", sizes: "512x512", type: "image/png" }],
    apple: "/logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ThemeInitializer />
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
