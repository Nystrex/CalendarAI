-- School Items + Grades System
-- Manual assignments/quizzes/exams and grade tracking per course

-- Courses
CREATE TABLE IF NOT EXISTS school_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  term TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, code, term)
);

-- Items (assignments, quizzes, exams)
CREATE TABLE IF NOT EXISTS school_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES school_courses(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('assignment', 'quiz', 'exam')),
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  points_possible NUMERIC,
  is_completed BOOLEAN DEFAULT false,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  reminder_1_minutes INTEGER DEFAULT 1440,
  reminder_2_minutes INTEGER DEFAULT 120,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grade categories (weights)
CREATE TABLE IF NOT EXISTS grade_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES school_courses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  weight_percent NUMERIC NOT NULL CHECK (weight_percent >= 0 AND weight_percent <= 100),
  drop_lowest INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, name)
);

-- Grade entries
CREATE TABLE IF NOT EXISTS grade_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES school_courses(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES grade_categories(id) ON DELETE SET NULL,
  item_id UUID REFERENCES school_items(id) ON DELETE SET NULL,
  title TEXT,
  score NUMERIC,
  out_of NUMERIC,
  graded_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE school_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_entries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own school courses" ON school_courses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own school courses" ON school_courses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own school courses" ON school_courses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own school courses" ON school_courses
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own school items" ON school_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own school items" ON school_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own school items" ON school_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own school items" ON school_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own grade categories" ON grade_categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own grade categories" ON grade_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own grade categories" ON grade_categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own grade categories" ON grade_categories
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own grade entries" ON grade_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own grade entries" ON grade_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own grade entries" ON grade_entries
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own grade entries" ON grade_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_school_courses_user_id ON school_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_school_items_user_id ON school_items(user_id);
CREATE INDEX IF NOT EXISTS idx_school_items_course_id ON school_items(course_id);
CREATE INDEX IF NOT EXISTS idx_school_items_due_at ON school_items(due_at);
CREATE INDEX IF NOT EXISTS idx_grade_categories_course_id ON grade_categories(course_id);
CREATE INDEX IF NOT EXISTS idx_grade_entries_course_id ON grade_entries(course_id);
CREATE INDEX IF NOT EXISTS idx_grade_entries_item_id ON grade_entries(item_id);
