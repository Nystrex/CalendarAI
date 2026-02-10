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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Force dark mode immediately
                  document.documentElement.classList.add('dark');
                  
                  // Apply stored theme colors
                  const stored = localStorage.getItem('theme') || 'default';
                  const themes = {
                    default: { primary: 'oklch(0.488 0.243 264.376)', chart1: 'oklch(0.488 0.243 264.376)', chart2: 'oklch(0.696 0.17 162.48)', chart3: 'oklch(0.769 0.188 70.08)' },
                    guelph: { primary: 'oklch(0.45 0.19 25)', chart1: 'oklch(0.45 0.19 25)', chart2: 'oklch(0.75 0.15 85)', chart3: 'oklch(0.35 0.12 25)' },
                    mcmaster: { primary: 'oklch(0.40 0.15 15)', chart1: 'oklch(0.40 0.15 15)', chart2: 'oklch(0.65 0.08 50)', chart3: 'oklch(0.30 0.10 15)' },
                    toronto: { primary: 'oklch(0.42 0.20 265)', chart1: 'oklch(0.42 0.20 265)', chart2: 'oklch(0.70 0.12 60)', chart3: 'oklch(0.32 0.15 265)' },
                    waterloo: { primary: 'oklch(0.45 0.15 85)', chart1: 'oklch(0.45 0.15 85)', chart2: 'oklch(0.30 0.08 265)', chart3: 'oklch(0.60 0.12 85)' },
                    western: { primary: 'oklch(0.42 0.20 285)', chart1: 'oklch(0.42 0.20 285)', chart2: 'oklch(0.65 0.08 50)', chart3: 'oklch(0.32 0.15 285)' },
                    queens: { primary: 'oklch(0.35 0.18 25)', chart1: 'oklch(0.35 0.18 25)', chart2: 'oklch(0.50 0.20 265)', chart3: 'oklch(0.75 0.15 85)' },
                    york: { primary: 'oklch(0.40 0.18 25)', chart1: 'oklch(0.40 0.18 25)', chart2: 'oklch(0.30 0.05 265)', chart3: 'oklch(0.60 0.08 50)' }
                  };
                  const theme = themes[stored] || themes.default;
                  const root = document.documentElement;
                  root.style.setProperty('--sidebar-primary', theme.primary);
                  root.style.setProperty('--chart-1', theme.chart1);
                  root.style.setProperty('--chart-2', theme.chart2);
                  root.style.setProperty('--chart-3', theme.chart3);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
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
