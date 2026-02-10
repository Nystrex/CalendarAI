"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X, Sparkles } from "lucide-react"
import { useAppSettings } from "@/lib/hooks/use-app-settings"

interface PlansDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTier: string
}

export function PlansDialog({ open, onOpenChange, currentTier }: PlansDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { settings } = useAppSettings()

  const premiumPrice = Number(settings?.premium_price) || 8
  const saleActive = settings?.sale_active === true
  const salePercentage = Number(settings?.sale_percentage) || 0
  const salePrice = saleActive ? (premiumPrice * (1 - salePercentage / 100)).toFixed(2) : null

  const handleSubscribe = async (tier: string) => {
    if (tier === "free") return
    setIsLoading(true)
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "premium" }),
      })
      const { url } = await response.json()
      if (url) window.location.href = url
    } catch (error) {
      console.error("Checkout error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const features = {
    free: [
      { name: "Up to 5 Google Calendars", included: true },
      { name: "5 AI homework queries/day", included: true },
      { name: "Basic calendar views", included: true },
      { name: "1 theme", included: true },
      { name: "Unlimited calendars", included: false },
      { name: "Unlimited AI queries", included: false },
      { name: "Year view", included: false },
      { name: "Premium themes", included: false },
      { name: "AI file analysis", included: false },
      { name: "Priority support chat", included: false },
    ],
    premium: [
      { name: "Unlimited Google Calendars", included: true },
      { name: "Unlimited AI homework queries", included: true },
      { name: "All calendar views + Year view", included: true },
      { name: "All premium themes", included: true },
      { name: "AI file analysis (PDFs, images, docs)", included: true },
      { name: "Priority support chat with admins", included: true },
      { name: "Smart event suggestions", included: true },
      { name: "Export calendar data", included: true },
    ],
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] md:max-w-[1000px] lg:max-w-[1100px] w-[95vw] p-8 md:p-10">
        <DialogHeader className="space-y-2 mb-6">
          <DialogTitle className="text-3xl font-bold">Choose Your Plan</DialogTitle>
          <DialogDescription className="text-base">
            Compare features and find the right plan for your needs
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:gap-10 grid-cols-1 md:grid-cols-2 w-full">
          {/* Free Plan */}
          <Card className={`${currentTier === "free" ? "border-2 border-primary" : "border"} flex flex-col`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Free</CardTitle>
                {currentTier === "free" && (
                  <span className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                    Current
                  </span>
                )}
              </div>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="mt-4 pt-4 border-t">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex-1 flex flex-col">
              <ul className="space-y-3 flex-1">
                {features.free.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    )}
                    <span className={`text-sm ${feature.included ? "" : "text-muted-foreground line-through"}`}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSubscribe("free")}
                disabled={currentTier === "free"}
                variant="outline"
                className="w-full mt-4 bg-transparent"
              >
                {currentTier === "free" ? "Current Plan" : "Get Started"}
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className={`${currentTier === "premium" ? "border-2 border-primary" : "border-2 border-primary/50"} flex flex-col bg-gradient-to-b from-primary/5 to-transparent`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl flex items-center gap-2">
                  Premium
                  <Sparkles className="h-5 w-5 text-amber-500" />
                </CardTitle>
                {currentTier === "premium" && (
                  <span className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                    Current
                  </span>
                )}
              </div>
              <CardDescription>For power users and students</CardDescription>
              <div className="mt-4 pt-4 border-t">
                {saleActive && salePrice ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl text-muted-foreground line-through">${premiumPrice}</span>
                      <Badge className="bg-green-500 text-white">{salePercentage}% OFF</Badge>
                    </div>
                    <div>
                      <span className="text-4xl font-bold">${salePrice}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-4xl font-bold">${premiumPrice}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex-1 flex flex-col">
              <ul className="space-y-3 flex-1">
                {features.premium.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm">{feature.name}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSubscribe("premium")}
                disabled={currentTier === "premium" || isLoading}
                className="w-full mt-4"
              >
                {currentTier === "premium" ? "Current Plan" : "Upgrade to Premium"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
