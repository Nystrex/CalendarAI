-- Advanced Features: Study Sessions, Gamification, Templates
-- Run this migration to add new features to CalendarAI
-- Note: Grade tracking is handled by the existing School tab (school_courses, school_grade_entries, etc.)

-- ============================================
-- STUDY PLANNER
-- ============================================

-- Study sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  course_id UUID REFERENCES school_courses(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  session_type TEXT DEFAULT 'study',
  completed BOOLEAN DEFAULT FALSE,
  focus_score INTEGER CHECK (focus_score >= 1 AND focus_score <= 10),
  notes TEXT,
  pomodoro_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study goals
CREATE TABLE IF NOT EXISTS study_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES school_courses(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  target_hours DECIMAL(5,2),
  hours_completed DECIMAL(5,2) DEFAULT 0,
  deadline TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GAMIFICATION
-- ============================================

-- User stats and XP
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  tasks_completed INTEGER DEFAULT 0,
  study_hours DECIMAL(10,2) DEFAULT 0,
  perfect_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  xp_reward INTEGER DEFAULT 0,
  requirement_type TEXT,
  requirement_value INTEGER,
  rarity TEXT DEFAULT 'common',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements (unlocked)
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

-- Daily challenges
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL,
  target_value INTEGER,
  current_value INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 50,
  completed BOOLEAN DEFAULT FALSE,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_type, date)
);

-- ============================================
-- CALENDAR TEMPLATES
-- ============================================

-- Templates
CREATE TABLE IF NOT EXISTS calendar_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'custom',
  is_public BOOLEAN DEFAULT FALSE,
  is_official BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template events
CREATE TABLE IF NOT EXISTS template_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES calendar_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  recurrence_pattern TEXT,
  day_of_week INTEGER,
  time_of_day TIME,
  color TEXT,
  category TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_course_id ON study_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_study_goals_user_id ON study_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date ON daily_challenges(user_id, date);
CREATE INDEX IF NOT EXISTS idx_calendar_templates_user_id ON calendar_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_templates_public ON calendar_templates(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_template_events_template_id ON template_events(template_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_events ENABLE ROW LEVEL SECURITY;

-- Study sessions policies
DROP POLICY IF EXISTS "Users can view own study sessions" ON study_sessions;
CREATE POLICY "Users can view own study sessions" ON study_sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own study sessions" ON study_sessions;
CREATE POLICY "Users can insert own study sessions" ON study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own study sessions" ON study_sessions;
CREATE POLICY "Users can update own study sessions" ON study_sessions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own study sessions" ON study_sessions;
CREATE POLICY "Users can delete own study sessions" ON study_sessions FOR DELETE USING (auth.uid() = user_id);

-- Study goals policies
DROP POLICY IF EXISTS "Users can view own study goals" ON study_goals;
CREATE POLICY "Users can view own study goals" ON study_goals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own study goals" ON study_goals;
CREATE POLICY "Users can insert own study goals" ON study_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own study goals" ON study_goals;
CREATE POLICY "Users can update own study goals" ON study_goals FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own study goals" ON study_goals;
CREATE POLICY "Users can delete own study goals" ON study_goals FOR DELETE USING (auth.uid() = user_id);

-- User stats policies
DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
CREATE POLICY "Users can view own stats" ON user_stats FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
CREATE POLICY "Users can insert own stats" ON user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;
CREATE POLICY "Users can update own stats" ON user_stats FOR UPDATE USING (auth.uid() = user_id);

-- Achievements policies (public read)
DROP POLICY IF EXISTS "Anyone can view achievements" ON achievements;
CREATE POLICY "Anyone can view achievements" ON achievements FOR SELECT USING (TRUE);

-- User achievements policies
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own achievements" ON user_achievements;
CREATE POLICY "Users can insert own achievements" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily challenges policies
DROP POLICY IF EXISTS "Users can view own challenges" ON daily_challenges;
CREATE POLICY "Users can view own challenges" ON daily_challenges FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own challenges" ON daily_challenges;
CREATE POLICY "Users can insert own challenges" ON daily_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own challenges" ON daily_challenges;
CREATE POLICY "Users can update own challenges" ON daily_challenges FOR UPDATE USING (auth.uid() = user_id);

-- Calendar templates policies
DROP POLICY IF EXISTS "Users can view own templates" ON calendar_templates;
CREATE POLICY "Users can view own templates" ON calendar_templates FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);
DROP POLICY IF EXISTS "Users can insert own templates" ON calendar_templates;
CREATE POLICY "Users can insert own templates" ON calendar_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own templates" ON calendar_templates;
CREATE POLICY "Users can update own templates" ON calendar_templates FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own templates" ON calendar_templates;
CREATE POLICY "Users can delete own templates" ON calendar_templates FOR DELETE USING (auth.uid() = user_id);

-- Template events policies
DROP POLICY IF EXISTS "Users can view template events" ON template_events;
CREATE POLICY "Users can view template events" ON template_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM calendar_templates 
    WHERE calendar_templates.id = template_events.template_id 
    AND (calendar_templates.user_id = auth.uid() OR calendar_templates.is_public = TRUE)
  )
);
DROP POLICY IF EXISTS "Users can insert template events" ON template_events;
CREATE POLICY "Users can insert template events" ON template_events FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM calendar_templates 
    WHERE calendar_templates.id = template_events.template_id 
    AND calendar_templates.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Users can update template events" ON template_events;
CREATE POLICY "Users can update template events" ON template_events FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM calendar_templates 
    WHERE calendar_templates.id = template_events.template_id 
    AND calendar_templates.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Users can delete template events" ON template_events;
CREATE POLICY "Users can delete template events" ON template_events FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM calendar_templates 
    WHERE calendar_templates.id = template_events.template_id 
    AND calendar_templates.user_id = auth.uid()
  )
);

-- ============================================
-- SEED DATA - Default Achievements
-- ============================================

INSERT INTO achievements (id, name, description, icon, category, xp_reward, requirement_type, requirement_value, rarity) VALUES
  ('first_task', 'Getting Started', 'Complete your first task', '🎯', 'tasks', 10, 'tasks_completed', 1, 'common'),
  ('task_master_10', 'Task Master', 'Complete 10 tasks', '⭐', 'tasks', 50, 'tasks_completed', 10, 'common'),
  ('task_master_50', 'Task Crusher', 'Complete 50 tasks', '💪', 'tasks', 200, 'tasks_completed', 50, 'rare'),
  ('task_master_100', 'Century Club', 'Complete 100 tasks', '💯', 'tasks', 500, 'tasks_completed', 100, 'epic'),
  ('streak_3', 'On a Roll', 'Maintain a 3-day streak', '🔥', 'streaks', 30, 'current_streak', 3, 'common'),
  ('streak_7', 'Week Warrior', 'Maintain a 7-day streak', '⚡', 'streaks', 100, 'current_streak', 7, 'rare'),
  ('streak_30', 'Monthly Master', 'Maintain a 30-day streak', '👑', 'streaks', 500, 'current_streak', 30, 'epic'),
  ('streak_100', 'Unstoppable', 'Maintain a 100-day streak', '🏆', 'streaks', 2000, 'current_streak', 100, 'legendary'),
  ('early_bird', 'Early Bird', 'Complete a task before 8 AM', '🌅', 'special', 25, 'special', 1, 'common'),
  ('night_owl', 'Night Owl', 'Complete a task after 10 PM', '🦉', 'special', 25, 'special', 1, 'common'),
  ('perfect_day', 'Perfect Day', 'Complete all tasks in a day', '✨', 'special', 100, 'perfect_days', 1, 'rare'),
  ('study_1h', 'Study Starter', 'Study for 1 hour', '📚', 'study', 20, 'study_hours', 1, 'common'),
  ('study_10h', 'Dedicated Student', 'Study for 10 hours total', '📖', 'study', 100, 'study_hours', 10, 'rare'),
  ('study_50h', 'Scholar', 'Study for 50 hours total', '🎓', 'study', 500, 'study_hours', 50, 'epic'),
  ('level_5', 'Rising Star', 'Reach level 5', '⭐', 'levels', 50, 'level', 5, 'common'),
  ('level_10', 'Expert', 'Reach level 10', '💫', 'levels', 200, 'level', 10, 'rare'),
  ('level_25', 'Master', 'Reach level 25', '🌟', 'levels', 1000, 'level', 25, 'epic'),
  ('level_50', 'Legend', 'Reach level 50', '👑', 'levels', 5000, 'level', 50, 'legendary')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate GPA for a course
CREATE OR REPLACE FUNCTION calculate_course_grade(p_course_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_total_weight DECIMAL(5,2);
  v_weighted_sum DECIMAL(10,2);
  v_final_grade DECIMAL(5,2);
BEGIN
  SELECT 
    SUM(weight),
    SUM((grade / max_grade * 100) * weight)
  INTO v_total_weight, v_weighted_sum
  FROM grades
  WHERE course_id = p_course_id AND graded = TRUE;
  
  IF v_total_weight > 0 THEN
    v_final_grade := v_weighted_sum / v_total_weight;
  ELSE
    v_final_grade := NULL;
  END IF;
  
  RETURN v_final_grade;
END;
$$ LANGUAGE plpgsql;

-- Function to award XP and check for level up
CREATE OR REPLACE FUNCTION award_xp(p_user_id UUID, p_xp INTEGER)
RETURNS VOID AS $$
DECLARE
  v_current_xp INTEGER;
  v_current_level INTEGER;
  v_new_level INTEGER;
  v_xp_for_next_level INTEGER;
BEGIN
  -- Get current stats
  SELECT xp, level INTO v_current_xp, v_current_level
  FROM user_stats
  WHERE user_id = p_user_id;
  
  -- If no stats exist, create them
  IF NOT FOUND THEN
    INSERT INTO user_stats (user_id, xp, total_xp, level)
    VALUES (p_user_id, p_xp, p_xp, 1);
    RETURN;
  END IF;
  
  -- Add XP
  v_current_xp := v_current_xp + p_xp;
  
  -- Calculate level (100 XP per level, increasing by 50 each level)
  v_new_level := v_current_level;
  v_xp_for_next_level := 100 + (v_current_level * 50);
  
  WHILE v_current_xp >= v_xp_for_next_level LOOP
    v_current_xp := v_current_xp - v_xp_for_next_level;
    v_new_level := v_new_level + 1;
    v_xp_for_next_level := 100 + (v_new_level * 50);
  END LOOP;
  
  -- Update stats
  UPDATE user_stats
  SET 
    xp = v_current_xp,
    total_xp = total_xp + p_xp,
    level = v_new_level,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM user_stats
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_stats (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, 1, 1, CURRENT_DATE);
    RETURN;
  END IF;
  
  -- Check if activity is today
  IF v_last_activity = CURRENT_DATE THEN
    RETURN; -- Already counted today
  END IF;
  
  -- Check if activity was yesterday (continue streak)
  IF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
  ELSE
    -- Streak broken, reset to 1
    v_current_streak := 1;
  END IF;
  
  UPDATE user_stats
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_activity_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
