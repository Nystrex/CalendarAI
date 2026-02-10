"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { universityThemes, applyTheme, getStoredTheme, type ThemeKey } from "@/lib/themes"
import { Check } from "lucide-react"

export function ThemeSelector() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("guelph")

  useEffect(() => {
    const storedTheme = getStoredTheme()
    setSelectedTheme(storedTheme)
    applyTheme(storedTheme)
  }, [])

  const handleThemeChange = (themeKey: ThemeKey) => {
    setSelectedTheme(themeKey)
    applyTheme(themeKey)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>University Theme</CardTitle>
        <CardDescription>Choose a color scheme based on your university</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedTheme} onValueChange={(value) => handleThemeChange(value as ThemeKey)}>
          <div className="flex flex-wrap justify-center gap-3">
            {Object.entries(universityThemes).map(([key, theme]) => (
              <div 
                key={key} 
                className="relative w-full sm:w-[calc(50%-6px)]"
              >
                <RadioGroupItem value={key} id={key} className="peer sr-only" />
                <Label
                  htmlFor={key}
                  className="flex cursor-pointer flex-col gap-2 rounded-lg border-2 border-muted bg-card p-3 hover:bg-accent peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{theme.name}</span>
                    {selectedTheme === key && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <div className="flex gap-1.5 justify-center">
                    <div
                      className="h-6 w-6 rounded-md border"
                      style={{ backgroundColor: theme.colors.primary }}
                      title="Primary"
                    />
                    <div
                      className="h-6 w-6 rounded-md border"
                      style={{ backgroundColor: theme.colors.accent }}
                      title="Accent"
                    />
                    <div
                      className="h-6 w-6 rounded-md border"
                      style={{ backgroundColor: theme.colors.chart1 }}
                      title="Chart"
                    />
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
