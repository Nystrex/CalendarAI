"use client"

import { useAppSettings } from "@/lib/hooks/use-app-settings"
import { X, Sparkles } from "lucide-react"
import { useState } from "react"

export function SaleBanner() {
  const { settings } = useAppSettings()
  const [dismissed, setDismissed] = useState(false)

  if (!settings?.sale_active || dismissed) {
    return null
  }

  // Check if sale has expired
  if (settings.sale_end_date) {
    const endDate = new Date(settings.sale_end_date)
    if (endDate < new Date()) return null
  }

  const originalPrice = Number(settings.premium_price) || 8
  const discount = Number(settings.sale_percentage) || 0
  const salePrice = (originalPrice * (1 - discount / 100)).toFixed(2)

  return (
    <div className="relative flex items-center gap-3 rounded-lg border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3">
      <Sparkles className="h-5 w-5 shrink-0 text-primary" />
      <div className="flex-1 flex items-center gap-3 text-sm">
        <span className="font-bold text-primary">
          {settings.sale_banner_text || "Limited Time Offer!"}
        </span>
        <span className="text-muted-foreground">
          Premium now <span className="line-through">${originalPrice}</span>{" "}
          <span className="font-bold text-primary">${salePrice}/mo</span>{" "}
          ({discount}% off)
        </span>
      </div>
      <button onClick={() => setDismissed(true)} className="shrink-0 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
