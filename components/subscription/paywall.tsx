"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Crown, Sparkles, Zap } from "lucide-react"
import { useRouter } from "next/navigation"

interface PaywallProps {
  feature: string
  description: string
  queriesRemaining?: number
}

export function Paywall({ feature, description, queriesRemaining }: PaywallProps) {
  const router = useRouter()

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <Crown className="h-8 w-8 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">Upgrade to Premium</CardTitle>
        <CardDescription className="text-base">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {typeof queriesRemaining === "number" && (
          <div className="text-center p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">Free AI Queries Used</p>
            <p className="text-3xl font-bold">{5 - queriesRemaining} / 5</p>
            <p className="text-xs text-muted-foreground mt-1">Resets monthly</p>
          </div>
        )}
        
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Unlimited AI Homework Helper</p>
              <p className="text-sm text-muted-foreground">Chat with AI, upload images, get instant help</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Unlimited AI Event Extraction</p>
              <p className="text-sm text-muted-foreground">Bulk import events from text or images</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">All Premium Features</p>
              <p className="text-sm text-muted-foreground">Year view, all themes, priority support, and more</p>
            </div>
          </div>
        </div>

        <Button 
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          onClick={() => router.push("/dashboard/settings?tab=subscription")}
        >
          <Crown className="mr-2 h-5 w-5" />
          Upgrade to Premium
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          $8/month • Cancel anytime
        </p>
      </CardContent>
    </Card>
  )
}
