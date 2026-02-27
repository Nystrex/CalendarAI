-- App settings table for admin-configurable options
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert all default settings
INSERT INTO app_settings (key, value) VALUES
  -- Pricing & Sales
  ('premium_price', '"8"'),
  ('sale_active', 'false'),
  ('sale_percentage', '"0"'),
  ('sale_end_date', 'null'),
  ('sale_banner_text', '"Limited Time Offer!"'),
  
  -- Trial
  ('trial_enabled', 'true'),
  ('trial_duration_days', '"14"'),
  
  -- Free Tier Limits
  ('free_ai_queries_per_day', '"5"'),
  ('free_calendars_limit', '"5"'),
  ('free_ai_extractions_per_month', '"5"'),
  
  -- Announcement Banner
  ('announcement_active', 'false'),
  ('announcement_text', '""'),
  ('announcement_type', '"info"'),
  
  -- Maintenance
  ('maintenance_mode', 'false'),
  ('maintenance_message', '"We are currently performing scheduled maintenance. Please check back soon."'),
  
  -- Branding
  ('app_name', '"CalendarAI"'),
  ('app_tagline', '"Your AI-powered academic calendar"'),
  
  -- Feature Toggles
  ('feature_lms', 'true'),
  ('feature_homework_ai', 'true'),
  ('feature_google_calendar', 'true'),
  ('feature_ai_extraction', 'true'),
  ('feature_themes', 'true'),
  ('feature_support_chat', 'true'),
  ('feature_year_view', 'true'),
  
  -- Onboarding
  ('onboarding_enabled', 'true'),
  ('welcome_message', '"Welcome to CalendarAI! Let us show you around."'),
  
  -- Referral / Promo
  ('promo_code_active', 'false'),
  ('promo_code', '""'),
  ('promo_discount_percentage', '"0"')
ON CONFLICT (key) DO NOTHING;

-- Allow admins to read/write, users to read
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can read app settings"
  ON app_settings FOR SELECT
  USING (true);

-- Only admins (via service role) can update settings - handled via API route
