"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  Save,
  DollarSign,
  Percent,
  Megaphone,
  Wrench,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Tag,
  Clock,
  Shield,
  Type,
  Gift,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

type SettingsMap = Record<string, any>

export function AdminConfigPanel() {
  const [settings, setSettings] = useState<SettingsMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings")
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const saveSetting = async (key: string, value: unknown) => {
    setSaving(key)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) {
        setSettings(prev => ({ ...prev, [key]: value }))
        toast.success(`Saved ${key.replace(/_/g, " ")}`)
      } else {
        toast.error("Failed to save setting")
      }
    } catch {
      toast.error("Failed to save setting")
    } finally {
      setSaving(null)
    }
  }

  const Toggle = ({ settingKey, label, description }: { settingKey: string; label: string; description?: string }) => {
    const isOn = settings[settingKey] === true
    return (
      <div className="flex items-center justify-between py-3">
        <div className="space-y-0.5">
          <p className="font-medium text-sm">{label}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          disabled={saving === settingKey}
          onClick={() => saveSetting(settingKey, !isOn)}
        >
          {saving === settingKey ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isOn ? (
            <ToggleRight className="h-6 w-6 text-green-500" />
          ) : (
            <ToggleLeft className="h-6 w-6 text-muted-foreground" />
          )}
          <span className={`text-xs font-medium ${isOn ? "text-green-500" : "text-muted-foreground"}`}>
            {isOn ? "ON" : "OFF"}
          </span>
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">App Configuration</h3>
          <p className="text-sm text-muted-foreground">Manage every aspect of your app without writing code</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSettings} className="gap-2 bg-transparent">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* =================== PRICING & SALES =================== */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5 text-green-500" />
              Pricing & Sales
            </CardTitle>
            <CardDescription>Control premium pricing and run sales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Premium Price ($/month)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={String(settings.premium_price || "8")}
                  onChange={(e) => setSettings(prev => ({ ...prev, premium_price: e.target.value }))}
                  className="w-32"
                />
                <Button
                  size="sm"
                  disabled={saving === "premium_price"}
                  onClick={() => saveSetting("premium_price", String(settings.premium_price))}
                >
                  {saving === "premium_price" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <Toggle settingKey="sale_active" label="Sale Active" description="Show sale pricing to users" />
            </div>

            {settings.sale_active && (
              <div className="space-y-3 rounded-lg border border-dashed border-green-500/30 bg-green-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">Sale Configuration</span>
                </div>
                <div className="space-y-2">
                  <Label>Discount Percentage</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={String(settings.sale_percentage || "0")}
                      onChange={(e) => setSettings(prev => ({ ...prev, sale_percentage: e.target.value }))}
                      className="w-32"
                    />
                    <Button
                      size="sm"
                      disabled={saving === "sale_percentage"}
                      onClick={() => saveSetting("sale_percentage", String(settings.sale_percentage))}
                    >
                      {saving === "sale_percentage" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sale End Date</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={String(settings.sale_end_date || "")}
                      onChange={(e) => setSettings(prev => ({ ...prev, sale_end_date: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      disabled={saving === "sale_end_date"}
                      onClick={() => saveSetting("sale_end_date", settings.sale_end_date || null)}
                    >
                      {saving === "sale_end_date" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sale Banner Text</Label>
                  <div className="flex gap-2">
                    <Input
                      value={String(settings.sale_banner_text || "")}
                      onChange={(e) => setSettings(prev => ({ ...prev, sale_banner_text: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      disabled={saving === "sale_banner_text"}
                      onClick={() => saveSetting("sale_banner_text", String(settings.sale_banner_text))}
                    >
                      {saving === "sale_banner_text" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {settings.sale_percentage && Number(settings.premium_price) > 0 && (
                  <div className="mt-2 rounded-md bg-green-500/10 p-3 text-sm">
                    <span className="text-muted-foreground line-through">${settings.premium_price}/mo</span>
                    {" "}
                    <span className="font-bold text-green-500">
                      ${(Number(settings.premium_price) * (1 - Number(settings.sale_percentage) / 100)).toFixed(2)}/mo
                    </span>
                    <Badge variant="outline" className="ml-2 border-green-500/30 text-green-500">{settings.sale_percentage}% OFF</Badge>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* =================== FREE TRIAL =================== */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-blue-500" />
              Free Trial
            </CardTitle>
            <CardDescription>Configure the free trial offer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle settingKey="trial_enabled" label="Trial Enabled" description="Allow new users to claim a free trial" />
            <div className="space-y-2">
              <Label>Trial Duration (days)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={String(settings.trial_duration_days || "14")}
                  onChange={(e) => setSettings(prev => ({ ...prev, trial_duration_days: e.target.value }))}
                  className="w-32"
                />
                <Button
                  size="sm"
                  disabled={saving === "trial_duration_days"}
                  onClick={() => saveSetting("trial_duration_days", String(settings.trial_duration_days))}
                >
                  {saving === "trial_duration_days" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* =================== FREE TIER LIMITS =================== */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-orange-500" />
              Free Tier Limits
            </CardTitle>
            <CardDescription>Set usage limits for free users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>AI Queries per Day</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={String(settings.free_ai_queries_per_day || "5")}
                  onChange={(e) => setSettings(prev => ({ ...prev, free_ai_queries_per_day: e.target.value }))}
                  className="w-32"
                />
                <Button
                  size="sm"
                  disabled={saving === "free_ai_queries_per_day"}
                  onClick={() => saveSetting("free_ai_queries_per_day", String(settings.free_ai_queries_per_day))}
                >
                  {saving === "free_ai_queries_per_day" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Max Calendars</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={String(settings.free_calendars_limit || "5")}
                  onChange={(e) => setSettings(prev => ({ ...prev, free_calendars_limit: e.target.value }))}
                  className="w-32"
                />
                <Button
                  size="sm"
                  disabled={saving === "free_calendars_limit"}
                  onClick={() => saveSetting("free_calendars_limit", String(settings.free_calendars_limit))}
                >
                  {saving === "free_calendars_limit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>AI Extractions per Month</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={String(settings.free_ai_extractions_per_month || "5")}
                  onChange={(e) => setSettings(prev => ({ ...prev, free_ai_extractions_per_month: e.target.value }))}
                  className="w-32"
                />
                <Button
                  size="sm"
                  disabled={saving === "free_ai_extractions_per_month"}
                  onClick={() => saveSetting("free_ai_extractions_per_month", String(settings.free_ai_extractions_per_month))}
                >
                  {saving === "free_ai_extractions_per_month" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* =================== ANNOUNCEMENT BANNER =================== */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-5 w-5 text-purple-500" />
              Announcement Banner
            </CardTitle>
            <CardDescription>Show a banner message to all users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle settingKey="announcement_active" label="Show Banner" description="Display announcement to all users" />

            {settings.announcement_active && (
              <div className="space-y-3 rounded-lg border border-dashed border-purple-500/30 bg-purple-500/5 p-4">
                <div className="space-y-2">
                  <Label>Banner Text</Label>
                  <div className="flex gap-2">
                    <Textarea
                      value={String(settings.announcement_text || "")}
                      onChange={(e) => setSettings(prev => ({ ...prev, announcement_text: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={saving === "announcement_text"}
                    onClick={() => saveSetting("announcement_text", String(settings.announcement_text))}
                  >
                    {saving === "announcement_text" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Banner Text
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Banner Type</Label>
                  <div className="flex gap-2">
                    {["info", "warning", "success", "error"].map((type) => (
                      <Button
                        key={type}
                        size="sm"
                        variant={settings.announcement_type === type ? "default" : "outline"}
                        className={settings.announcement_type !== type ? "bg-transparent" : ""}
                        onClick={() => saveSetting("announcement_type", type)}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
                {/* Preview */}
                <div className={`mt-2 rounded-md p-3 text-sm ${
                  settings.announcement_type === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                  settings.announcement_type === "warning" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                  settings.announcement_type === "success" ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                  "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                }`}>
                  <p className="font-medium text-xs mb-1">Preview:</p>
                  {String(settings.announcement_text || "Your announcement text here...")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* =================== BRANDING =================== */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Type className="h-5 w-5 text-pink-500" />
              Branding
            </CardTitle>
            <CardDescription>Customize app name and tagline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>App Name</Label>
              <div className="flex gap-2">
                <Input
                  value={String(settings.app_name || "CalendarAI")}
                  onChange={(e) => setSettings(prev => ({ ...prev, app_name: e.target.value }))}
                />
                <Button
                  size="sm"
                  disabled={saving === "app_name"}
                  onClick={() => saveSetting("app_name", String(settings.app_name))}
                >
                  {saving === "app_name" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <div className="flex gap-2">
                <Input
                  value={String(settings.app_tagline || "")}
                  onChange={(e) => setSettings(prev => ({ ...prev, app_tagline: e.target.value }))}
                />
                <Button
                  size="sm"
                  disabled={saving === "app_tagline"}
                  onClick={() => saveSetting("app_tagline", String(settings.app_tagline))}
                >
                  {saving === "app_tagline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* =================== PROMO CODES =================== */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="h-5 w-5 text-amber-500" />
              Promo Codes
            </CardTitle>
            <CardDescription>Create promotional discount codes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle settingKey="promo_code_active" label="Promo Code Active" description="Allow users to enter a promo code at checkout" />

            {settings.promo_code_active && (
              <div className="space-y-3 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-4">
                <div className="space-y-2">
                  <Label>Promo Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={String(settings.promo_code || "")}
                      onChange={(e) => setSettings(prev => ({ ...prev, promo_code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. STUDENT20"
                      className="uppercase"
                    />
                    <Button
                      size="sm"
                      disabled={saving === "promo_code"}
                      onClick={() => saveSetting("promo_code", String(settings.promo_code))}
                    >
                      {saving === "promo_code" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Discount Percentage</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={String(settings.promo_discount_percentage || "0")}
                      onChange={(e) => setSettings(prev => ({ ...prev, promo_discount_percentage: e.target.value }))}
                      className="w-32"
                    />
                    <Button
                      size="sm"
                      disabled={saving === "promo_discount_percentage"}
                      onClick={() => saveSetting("promo_discount_percentage", String(settings.promo_discount_percentage))}
                    >
                      {saving === "promo_discount_percentage" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* =================== MAINTENANCE MODE =================== */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-5 w-5 text-red-500" />
              Maintenance Mode
            </CardTitle>
            <CardDescription>Take the app offline for maintenance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle settingKey="maintenance_mode" label="Maintenance Mode" description="Show maintenance page to all non-admin users" />

            {settings.maintenance_mode && (
              <div className="space-y-3 rounded-lg border border-dashed border-red-500/30 bg-red-500/5 p-4">
                <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  App is currently in maintenance mode
                </div>
                <div className="space-y-2">
                  <Label>Maintenance Message</Label>
                  <Textarea
                    value={String(settings.maintenance_message || "")}
                    onChange={(e) => setSettings(prev => ({ ...prev, maintenance_message: e.target.value }))}
                    rows={2}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={saving === "maintenance_message"}
                    onClick={() => saveSetting("maintenance_message", String(settings.maintenance_message))}
                  >
                    {saving === "maintenance_message" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Message
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* =================== ONBOARDING =================== */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-cyan-500" />
              Onboarding
            </CardTitle>
            <CardDescription>Control the new user onboarding experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle settingKey="onboarding_enabled" label="Onboarding Guide" description="Show interactive guide to new users" />
            <div className="space-y-2">
              <Label>Welcome Message</Label>
              <div className="flex gap-2">
                <Input
                  value={String(settings.welcome_message || "")}
                  onChange={(e) => setSettings(prev => ({ ...prev, welcome_message: e.target.value }))}
                />
                <Button
                  size="sm"
                  disabled={saving === "welcome_message"}
                  onClick={() => saveSetting("welcome_message", String(settings.welcome_message))}
                >
                  {saving === "welcome_message" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* =================== FEATURE TOGGLES =================== */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ToggleRight className="h-5 w-5 text-emerald-500" />
            Feature Toggles
          </CardTitle>
          <CardDescription>Enable or disable app features globally</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0">
            <div className="px-2">
              <Toggle settingKey="feature_lms" label="University LMS" description="University LMS integration" />
            </div>
            <div className="px-2">
              <Toggle settingKey="feature_homework_ai" label="AI Homework Helper" description="AI-powered homework assistant" />
            </div>
            <div className="px-2">
              <Toggle settingKey="feature_google_calendar" label="Google Calendar Sync" description="Google Calendar integration" />
            </div>
            <div className="px-2">
              <Toggle settingKey="feature_ai_extraction" label="AI Event Extraction" description="Extract events from text/images" />
            </div>
            <div className="px-2">
              <Toggle settingKey="feature_themes" label="Themes" description="Custom theme selection" />
            </div>
            <div className="px-2">
              <Toggle settingKey="feature_support_chat" label="Support Chat" description="User support messaging" />
            </div>
            <div className="px-2">
              <Toggle settingKey="feature_year_view" label="Year View" description="Yearly calendar overview" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="gap-1.5 py-1.5">
              {settings.sale_active ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-muted-foreground" />}
              Sale {settings.sale_active ? `${settings.sale_percentage}% OFF` : "Inactive"}
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1.5">
              {settings.trial_enabled ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-muted-foreground" />}
              Trial {settings.trial_enabled ? `${settings.trial_duration_days}d` : "Disabled"}
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1.5">
              {settings.announcement_active ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-muted-foreground" />}
              Announcement {settings.announcement_active ? "Live" : "Off"}
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1.5">
              {settings.maintenance_mode ? <AlertTriangle className="h-3 w-3 text-red-500" /> : <CheckCircle2 className="h-3 w-3 text-green-500" />}
              {settings.maintenance_mode ? "Maintenance ON" : "App Live"}
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1.5">
              {settings.promo_code_active ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-muted-foreground" />}
              Promo {settings.promo_code_active ? String(settings.promo_code || "N/A") : "Off"}
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1.5">
              <DollarSign className="h-3 w-3" />
              ${settings.premium_price}/mo
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
