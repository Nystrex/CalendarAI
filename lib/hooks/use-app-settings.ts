"use client"

import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(res => res.json())

export type AppSettings = {
  premium_price: string
  sale_active: boolean
  sale_percentage: string
  sale_end_date: string | null
  sale_banner_text: string
  trial_enabled: boolean
  trial_duration_days: string
  free_ai_queries_per_day: string
  free_calendars_limit: string
  free_ai_extractions_per_month: string
  announcement_active: boolean
  announcement_text: string
  announcement_type: "info" | "warning" | "success" | "error"
  maintenance_mode: boolean
  maintenance_message: string
  app_name: string
  app_tagline: string
  feature_lms: boolean
  feature_homework_ai: boolean
  feature_google_calendar: boolean
  feature_ai_extraction: boolean
  feature_themes: boolean
  feature_support_chat: boolean
  feature_year_view: boolean
  onboarding_enabled: boolean
  welcome_message: string
  promo_code_active: boolean
  promo_code: string
  promo_discount_percentage: string
}

export function useAppSettings() {
  const { data, error, isLoading, mutate } = useSWR<AppSettings>("/api/settings/public", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  return {
    settings: data,
    isLoading,
    error,
    refresh: mutate,
  }
}
