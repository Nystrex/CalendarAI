"use client"

import { useAppSettings } from "@/lib/hooks/use-app-settings"
import { X, Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { useState } from "react"

export function AnnouncementBanner() {
  const { settings } = useAppSettings()
  const [dismissed, setDismissed] = useState(false)

  if (!settings?.announcement_active || dismissed || !settings.announcement_text) {
    return null
  }

  const typeConfig = {
    info: { icon: Info, bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400" },
    warning: { icon: AlertTriangle, bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400" },
    success: { icon: CheckCircle2, bg: "bg-green-500/10 border-green-500/20", text: "text-green-400" },
    error: { icon: XCircle, bg: "bg-red-500/10 border-red-500/20", text: "text-red-400" },
  }

  const config = typeConfig[settings.announcement_type] || typeConfig.info
  const Icon = config.icon

  return (
    <div className={`relative flex items-center gap-3 rounded-lg border px-4 py-3 ${config.bg}`}>
      <Icon className={`h-5 w-5 shrink-0 ${config.text}`} />
      <p className={`text-sm font-medium flex-1 ${config.text}`}>
        {settings.announcement_text}
      </p>
      <button onClick={() => setDismissed(true)} className={`shrink-0 ${config.text} hover:opacity-70`}>
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
