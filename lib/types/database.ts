export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          time_zone: string
          university: string | null
          university_verified: boolean
          subscription_tier: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          subscription_current_period_end: string | null
          ai_queries_used_today: number
          ai_queries_reset_date: string
          trial_used: boolean
          trial_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          time_zone?: string
          university?: string | null
          university_verified?: boolean
          subscription_tier?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_current_period_end?: string | null
          ai_queries_used_today?: number
          ai_queries_reset_date?: string
          trial_used?: boolean
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          time_zone?: string
          university?: string | null
          university_verified?: boolean
          subscription_tier?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_current_period_end?: string | null
          ai_queries_used_today?: number
          ai_queries_reset_date?: string
          trial_used?: boolean
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscription_history: {
        Row: {
          id: string
          user_id: string
          subscription_tier: string
          subscription_status: string
          stripe_subscription_id: string | null
          changed_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          subscription_tier: string
          subscription_status: string
          stripe_subscription_id?: string | null
          changed_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          subscription_tier?: string
          subscription_status?: string
          stripe_subscription_id?: string | null
          changed_at?: string
          metadata?: Json | null
        }
      }
      calendars: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          is_default: boolean
          provider: string
          provider_calendar_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          is_default?: boolean
          provider?: string
          provider_calendar_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          is_default?: boolean
          provider?: string
          provider_calendar_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          calendar_id: string
          user_id: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          all_day: boolean
          location: string | null
          reminder_minutes: number | null
          provider: string
          provider_event_id: string | null
          recurrence_rule: string | null
          recurrence_end_date: string | null
          recurrence_parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          calendar_id: string
          user_id: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          all_day?: boolean
          location?: string | null
          reminder_minutes?: number | null
          provider?: string
          provider_event_id?: string | null
          recurrence_rule?: string | null
          recurrence_end_date?: string | null
          recurrence_parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          calendar_id?: string
          user_id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          all_day?: boolean
          location?: string | null
          reminder_minutes?: number | null
          provider?: string
          provider_event_id?: string | null
          recurrence_rule?: string | null
          recurrence_end_date?: string | null
          recurrence_parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      oauth_connections: {
        Row: {
          id: string
          user_id: string
          provider: string
          provider_account_id: string
          access_token: string
          refresh_token: string | null
          token_expires_at: string | null
          scope: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          provider_account_id: string
          access_token: string
          refresh_token?: string | null
          token_expires_at?: string | null
          scope?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          provider_account_id?: string
          access_token?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          scope?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string
          changes: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string
          changes?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string
          entity_id?: string
          changes?: Json | null
          created_at?: string
        }
      }

      school_courses: {
        Row: {
          id: string
          user_id: string
          code: string
          name: string
          term: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          code: string
          name: string
          term?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          code?: string
          name?: string
          term?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      school_items: {
        Row: {
          id: string
          user_id: string
          course_id: string
          item_type: string
          title: string
          description: string | null
          due_at: string | null
          points_possible: number | null
          weight_percent: number | null
          is_completed: boolean
          event_id: string | null
          reminder_1_minutes: number
          reminder_2_minutes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          item_type: string
          title: string
          description?: string | null
          due_at?: string | null
          points_possible?: number | null
          weight_percent?: number | null
          is_completed?: boolean
          event_id?: string | null
          reminder_1_minutes?: number
          reminder_2_minutes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          item_type?: string
          title?: string
          description?: string | null
          due_at?: string | null
          points_possible?: number | null
          weight_percent?: number | null
          is_completed?: boolean
          event_id?: string | null
          reminder_1_minutes?: number
          reminder_2_minutes?: number
          created_at?: string
          updated_at?: string
        }
      }

      grade_categories: {
        Row: {
          id: string
          user_id: string
          course_id: string
          name: string
          weight_percent: number
          drop_lowest: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          name: string
          weight_percent: number
          drop_lowest?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          name?: string
          weight_percent?: number
          drop_lowest?: number
          created_at?: string
          updated_at?: string
        }
      }

      grade_entries: {
        Row: {
          id: string
          user_id: string
          course_id: string
          category_id: string | null
          item_id: string | null
          title: string | null
          score: number | null
          out_of: number | null
          graded_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          category_id?: string | null
          item_id?: string | null
          title?: string | null
          score?: number | null
          out_of?: number | null
          graded_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          category_id?: string | null
          item_id?: string | null
          title?: string | null
          score?: number | null
          out_of?: number | null
          graded_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
