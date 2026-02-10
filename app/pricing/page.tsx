import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Crown, Sparkles } from "lucide-react"
import Link from "next/link"

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade when you need more power
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {/* Free Tier */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>Perfect for trying it out</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>1 Google Calendar sync</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Basic calendar views (Day/Week/Month)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>5 AI queries per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Basic themes</span>
                </li>
              </ul>
              <Link href="/auth/sign-up">
                <Button className="w-full mt-6 bg-transparent" variant="outline">
                  Get Started Free
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Premium Tier */}
          <Card className="border-2 border-primary shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-br from-primary to-primary/60 text-primary-foreground px-4 py-1 text-sm font-semibold">
              BEST VALUE
            </div>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">Premium</CardTitle>
              </div>
              <CardDescription>For serious students</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$8</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span><strong>Unlimited AI Homework Helper</strong> - Chat, image uploads, instant help</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Unlimited Google Calendar syncs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Unlimited AI event extraction</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Year view + all calendar views</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>All premium themes</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Priority support</span>
                </li>
              </ul>
              <Link href="/dashboard/settings?tab=subscription">
                <Button className="w-full mt-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                  <Crown className="mr-2 h-5 w-5" />
                  Upgrade to Premium
                </Button>
              </Link>
              <p className="text-center text-xs text-muted-foreground">
                Cancel anytime, no questions asked
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="grid gap-6 text-left">
            <div>
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-muted-foreground">Yes! Cancel your subscription anytime with no penalties or fees.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-muted-foreground">We accept all major credit cards via Stripe.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Is there a student discount?</h3>
              <p className="text-muted-foreground">Our pricing is already student-friendly at $8/month! We may offer additional discounts in the future.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
