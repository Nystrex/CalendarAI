"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Crown, Loader2, ExternalLink, Sparkles } from "lucide-react"
import { getSubscriptionStatus } from "@/lib/utils/subscription"
import { toast } from "sonner"
import { PlansDialog } from "@/components/subscription/plans-dialog"

export function SubscriptionSettings() {
  const [loading, setLoading] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [loadingSubscription, setLoadingSubscription] = useState(true)
  const [showPlansDialog, setShowPlansDialog] = useState(false)
  const [trialStatus, setTrialStatus] = useState<any>(null)

  useEffect(() => {
    loadSubscription()
    checkTrial()
  }, [])

  const checkTrial = async () => {
    try {
      const response = await fetch("/api/trial/check", { method: "POST" })
      const data = await response.json()
      setTrialStatus(data)
      
      if (data.expired) {
        toast.info("Your free trial has ended. Upgrade to Premium to continue enjoying all features!")
        await loadSubscription() // Refresh subscription data
      }
    } catch (error) {
      console.error("Trial check error:", error)
    }
  }

  const loadSubscription = async () => {
    setLoadingSubscription(true)
    try {
      const data = await getSubscriptionStatus()
      setSubscription(data)
    } catch (error) {
      console.error("Error loading subscription:", error)
    } finally {
      setLoadingSubscription(false)
    }
  }

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
      })
      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error("Failed to create checkout session")
      }
    } catch (error) {
      console.error("Upgrade error:", error)
      toast.error("Failed to start upgrade process")
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      })
      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error("Failed to open billing portal")
      }
    } catch (error) {
      console.error("Portal error:", error)
      toast.error("Failed to open billing portal")
    } finally {
      setLoading(false)
    }
  }

  if (loadingSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const isPremium = subscription?.tier === "premium"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Subscription
          {isPremium && <Crown className="h-5 w-5 text-primary" />}
        </CardTitle>
        <CardDescription>
          Manage your subscription and billing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold capitalize">{subscription?.tier}</p>
                {trialStatus?.trialing && (
                  <Badge variant="default" className="bg-gradient-to-r from-primary to-accent">
                    Free Trial
                  </Badge>
                )}
                {isPremium && !trialStatus?.trialing && (
                  <Badge variant="default" className="bg-primary">
                    Active
                  </Badge>
                )}
              </div>
              {trialStatus?.trialing && trialStatus?.daysRemaining && (
                <p className="text-sm text-muted-foreground mt-1">
                  {trialStatus.daysRemaining} day{trialStatus.daysRemaining > 1 ? "s" : ""} remaining in trial
                </p>
              )}
            </div>
            {isPremium && subscription?.currentPeriodEnd && !trialStatus?.trialing && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Renews</p>
                <p className="font-medium">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            )}
            {trialStatus?.trialing && trialStatus?.expiresAt && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Trial ends</p>
                <p className="font-medium">
                  {new Date(trialStatus.expiresAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* AI Queries Usage */}
          {!isPremium && (
            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm font-medium mb-2">AI Queries Today</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(subscription?.queriesUsed / 5) * 100}%` }}
                  />
                </div>
                <p className="text-sm font-mono">
                  {subscription?.queriesUsed} / 5
                </p>
              </div>
              {subscription?.queriesRemaining === 0 && (
                <p className="text-xs text-destructive mt-2">
                  You've used all your free queries today. Upgrade for unlimited access!
                </p>
              )}
            </div>
          )}
        </div>

        {/* Trial Benefits Banner */}
        {trialStatus?.trialing && (
          <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border-2 border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">Enjoying your free trial?</p>
                <p className="text-xs text-muted-foreground mb-3">
                  You're currently enjoying all Premium features. Upgrade before your trial ends to keep unlimited access!
                </p>
                <Button 
                  onClick={() => setShowPlansDialog(true)} 
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Crown className="mr-2 h-3 w-3" />
                  Upgrade Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {isPremium && !trialStatus?.trialing ? (
          <Button 
            onClick={handleManageSubscription} 
            disabled={loading}
            variant="outline"
            className="w-full bg-transparent"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Manage Billing
          </Button>
        ) : !trialStatus?.trialing ? (
          <Button 
            onClick={() => setShowPlansDialog(true)} 
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            size="lg"
          >
            <Crown className="mr-2 h-4 w-4" />
            View Plans
          </Button>
        ) : null}
      </CardContent>

      <PlansDialog 
        open={showPlansDialog} 
        onOpenChange={setShowPlansDialog}
        currentTier={subscription?.tier || "free"}
      />
    </Card>
  )
}
