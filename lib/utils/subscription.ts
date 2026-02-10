import { createClient } from "@/lib/supabase/client"

export type SubscriptionTier = "free" | "premium"
export type SubscriptionStatus = "active" | "inactive" | "past_due" | "canceled" | "trialing"

export interface SubscriptionLimits {
  aiQueriesPerDay: number
  googleCalendarSync: number
  themes: "basic" | "all"
  features: {
    homeworkHelper: boolean
    unlimitedAIExtraction: boolean
    yearView: boolean
    prioritySupport: boolean
  }
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    aiQueriesPerDay: 5,
    googleCalendarSync: 5,
    themes: "basic",
    features: {
      homeworkHelper: false,
      unlimitedAIExtraction: false,
      yearView: false,
      prioritySupport: false,
    },
  },
  premium: {
    aiQueriesPerDay: Infinity,
    googleCalendarSync: Infinity,
    themes: "all",
    features: {
      homeworkHelper: true,
      unlimitedAIExtraction: true,
      yearView: true,
      prioritySupport: true,
    },
  },
}

export async function getSubscriptionStatus() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      tier: "free" as SubscriptionTier,
      status: "inactive" as SubscriptionStatus,
      limits: SUBSCRIPTION_LIMITS.free,
      queriesUsed: 0,
      queriesRemaining: 5,
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status, ai_queries_used_today, subscription_current_period_end")
    .eq("id", user.id)
    .single()

  const tier = (profile?.subscription_tier || "free") as SubscriptionTier
  const status = (profile?.subscription_status || "inactive") as SubscriptionStatus
  const limits = SUBSCRIPTION_LIMITS[tier]
  const queriesUsed = profile?.ai_queries_used_today || 0
  const queriesRemaining = tier === "premium" ? Infinity : Math.max(0, limits.aiQueriesPerDay - queriesUsed)

  return {
    tier,
    status,
    limits,
    queriesUsed,
    queriesRemaining,
    currentPeriodEnd: profile?.subscription_current_period_end,
  }
}

export async function incrementAIQueryCount() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, ai_queries_used_today")
    .eq("id", user.id)
    .single()

  if (!profile) return false

  // Premium users have unlimited queries
  if (profile.subscription_tier === "premium") return true

  // Check if free user has queries remaining
  const queriesUsed = profile.ai_queries_used_today || 0
  if (queriesUsed >= SUBSCRIPTION_LIMITS.free.aiQueriesPerDay) {
    return false
  }

  // Increment count
  await supabase
    .from("profiles")
    .update({ ai_queries_used_today: queriesUsed + 1 })
    .eq("id", user.id)

  return true
}

export function canAccessFeature(tier: SubscriptionTier, feature: keyof SubscriptionLimits["features"]): boolean {
  return SUBSCRIPTION_LIMITS[tier].features[feature]
}
