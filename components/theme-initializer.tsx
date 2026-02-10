"use client"

import { useEffect } from "react"
import { getStoredTheme, applyTheme } from "@/lib/themes"

export function ThemeInitializer() {
  useEffect(() => {
    const theme = getStoredTheme()
    applyTheme(theme)

    const observer = new MutationObserver(() => {
      if (!document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.add("dark")
      }
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}
