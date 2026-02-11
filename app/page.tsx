import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Sparkles, Zap, CalendarCheck, Globe, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      redirect("/dashboard")
    }
  } catch (error) {
    console.error("[v0] Auth check error:", error)
    // Continue rendering the page even if auth fails
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">CalendarAI</span>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/sign-up">Sign up</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32 lg:py-48">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,hsl(var(--primary)/0.08)_0%,transparent_100%)]" />
          
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              {/* Left: Content */}
              <div className="flex flex-col">
                <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-sm">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>Built for students</span>
                </div>
                
                <h1 className="mb-6 text-balance text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
                  Your AI-powered calendar and homework assistant
                </h1>
                
                <p className="mb-8 max-w-xl text-pretty text-lg text-muted-foreground md:text-xl">
                  Manage your schedule, sync with Google Calendar, and get instant homework help with AI. Everything you need to stay organized in one place.
                </p>
                
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25">
                    <Link href="/auth/sign-up">
                      Start 14-day free trial
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base bg-transparent">
                    <Link href="/pricing">View pricing</Link>
                  </Button>
                </div>
                
                <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <span>14 days Premium free</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    <span>Free forever after</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                    </div>
                    <span>No credit card</span>
                  </div>
                </div>
              </div>

              {/* Right: Visual */}
              <div className="relative lg:h-[600px]">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-accent/10 to-transparent rounded-3xl" />
                <div className="relative flex h-full items-center justify-center p-8">
                  <div className="grid gap-4 w-full max-w-md">
                    <div className="rounded-2xl border bg-card p-6 shadow-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">Smart Scheduling</p>
                          <p className="text-sm text-muted-foreground">AI conflict detection</p>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full w-3/4 bg-primary rounded-full" />
                      </div>
                    </div>
                    
                    <div className="rounded-2xl border bg-card p-6 shadow-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-semibold">Homework Helper</p>
                          <p className="text-sm text-muted-foreground">5 queries/day free</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Get instant help with assignments</p>
                      </div>
                    </div>
                    
                    <div className="rounded-2xl border bg-card p-6 shadow-xl">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                          <Globe className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-semibold">Google Calendar Sync</p>
                          <p className="text-sm text-muted-foreground">Up to 5 calendars</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="border-y bg-muted/30 px-6 py-12">
          <div className="mx-auto max-w-7xl">
            <p className="text-center text-sm font-medium text-muted-foreground mb-8">
              Trusted by students at top universities
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60">
              <span className="text-lg font-semibold">University of Toronto</span>
              <span className="text-lg font-semibold">Sheridan College</span>
              <span className="text-lg font-semibold">TMU</span>
              <span className="text-lg font-semibold">University of Guelph</span>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-6 py-20 md:px-10 md:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-4xl font-bold md:text-5xl">Everything you need to succeed</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful tools designed specifically for students to manage their time and excel academically
              </p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 transition-all hover:border-primary/50">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-3 text-xl font-bold">AI Homework Helper</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Get instant help with assignments, upload images, and receive detailed explanations. 5 queries per day free.
                </p>
              </div>
              
              <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 transition-all hover:border-primary/50">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                  <Globe className="h-7 w-7 text-blue-500" />
                </div>
                <h3 className="mb-3 text-xl font-bold">Google Calendar Sync</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Seamlessly sync up to 5 calendars with two-way Google Calendar integration. Never miss a class or deadline.
                </p>
              </div>
              
              <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 transition-all hover:border-primary/50">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5">
                  <Zap className="h-7 w-7 text-purple-500" />
                </div>
                <h3 className="mb-3 text-xl font-bold">AI Event Extraction</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Paste your syllabus or assignment list and watch AI automatically create calendar events for you.
                </p>
              </div>
              
              <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 transition-all hover:border-primary/50">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5">
                  <Clock className="h-7 w-7 text-orange-500" />
                </div>
                <h3 className="mb-3 text-xl font-bold">Smart Conflict Detection</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Get instant alerts when scheduling conflicts arise, so you can adjust before double-booking yourself.
                </p>
              </div>
              
              <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 transition-all hover:border-primary/50">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5">
                  <Calendar className="h-7 w-7 text-green-500" />
                </div>
                <h3 className="mb-3 text-xl font-bold">Multiple Views</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Switch between day, week, month, and year views (Premium) to visualize your schedule your way.
                </p>
              </div>
              
              <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 transition-all hover:border-primary/50">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-500/5">
                  <CalendarCheck className="h-7 w-7 text-pink-500" />
                </div>
                <h3 className="mb-3 text-xl font-bold">Custom Calendars</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Organize with multiple calendars, custom colors, and easy visibility toggles for different aspects of your life.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Teaser */}
        <section className="border-y bg-muted/30 px-6 py-20 md:px-10 md:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-3xl border-2 bg-card p-8 md:p-10">
                <div className="mb-4 inline-block rounded-full bg-muted px-3 py-1 text-sm font-medium">
                  Free Forever
                </div>
                <h3 className="mb-2 text-3xl font-bold">$0/month</h3>
                <p className="mb-6 text-muted-foreground">
                  Perfect for getting started
                </p>
                <ul className="mb-8 space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    Up to 5 Google Calendar syncs
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    5 AI homework queries per day
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    Basic calendar views
                  </li>
                </ul>
                <Button asChild variant="outline" size="lg" className="w-full bg-transparent">
                  <Link href="/auth/sign-up">Get started free</Link>
                </Button>
              </div>

              <div className="rounded-3xl border-2 border-primary bg-card p-8 md:p-10 relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <div className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Popular
                  </div>
                </div>
                <div className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  Premium
                </div>
                <h3 className="mb-2 text-3xl font-bold">$8/month</h3>
                <p className="mb-6 text-muted-foreground">
                  For serious students
                </p>
                <ul className="mb-8 space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    Unlimited Google Calendar syncs
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    Unlimited AI homework help
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    Year view + all premium features
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    Priority support
                  </li>
                </ul>
                <Button asChild size="lg" className="w-full shadow-lg shadow-primary/25">
                  <Link href="/auth/sign-up">Start free trial</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-20 md:px-10 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-6 text-4xl font-bold md:text-5xl">Ready to ace this semester?</h2>
            <p className="mb-10 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
              Join thousands of students who stay organized and get better grades with CalendarAI. Start with a 14-day Premium trial, free.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row justify-center">
              <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25">
                <Link href="/auth/sign-up">
                  Start 14-day free trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base bg-transparent">
                <Link href="/pricing">View all plans</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required. Cancel anytime.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 px-6 py-8 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="font-semibold">CalendarAI</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <a href="mailto:alcacounih@gmail.com" className="hover:text-primary transition-colors">
                Contact
              </a>
            </div>
          </div>
          <div className="mt-6 border-t pt-6 text-center text-sm text-muted-foreground">
            <p>© 2026 CalendarAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
