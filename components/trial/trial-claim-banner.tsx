"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, Crown, Check, X } from "lucide-react"
import { toast } from "sonner"

export function TrialClaimBanner() {
  const [claiming, setClaiming] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const handleClaimTrial = async () => {
    setClaiming(true)
    try {
      const response = await fetch("/api/trial/claim", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Failed to claim trial")
        if (data.error?.includes("already used")) {
          setDismissed(true)
        }
        return
      }

      toast.success(data.message)
      // Reload to update UI with trial status
      window.location.reload()
    } catch (error) {
      console.error("Claim trial error:", error)
      toast.error("Failed to claim trial")
    } finally {
      setClaiming(false)
    }
  }

  if (dismissed) return null

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-background p-6">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        title="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-bold">Try Premium Free for 14 Days</h3>
            <Crown className="h-5 w-5 text-amber-500" />
          </div>
          
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Get unlimited AI homework help, unlimited Google Calendar syncs, year view, and all premium features. No credit card required.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-green-500" />
              </div>
              <span>Unlimited AI queries</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-green-500" />
              </div>
              <span>Unlimited calendars</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-green-500" />
              </div>
              <span>Year view access</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-green-500" />
              </div>
              <span>Priority support</span>
            </div>
          </div>

          <Button 
            onClick={handleClaimTrial}
            disabled={claiming}
            size="lg"
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {claiming ? "Activating..." : "Start Free Trial"}
          </Button>
        </div>
      </div>
    </Card>
  )
}
