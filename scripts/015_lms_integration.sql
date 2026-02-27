-- University Integration System Schema
-- For connecting to various LMS systems (D2L, Canvas, Moodle, etc.)

-- Universities table
CREATE TABLE universities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE, -- e.g., "uoguelph.ca"
  lms_type TEXT NOT NULL CHECK (lms_type IN ('d2l', 'canvas', 'moodle', 'blackboard')),
  lms_url TEXT NOT NULL, -- e.g., "https://courselink.uoguelph.ca"
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LMS integrations (user connections to universities)
CREATE TABLE lms_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  university_id UUID REFERENCES universities(id) ON DELETE CASCADE NOT NULL,
  lms_user_id TEXT NOT NULL, -- User's ID in the LMS
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, university_id)
);

-- Courses synced from LMS
CREATE TABLE lms_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES lms_integrations(id) ON DELETE CASCADE NOT NULL,
  lms_course_id TEXT NOT NULL,
  course_code TEXT NOT NULL, -- e.g., "CIS*3760"
  course_name TEXT NOT NULL,
  semester TEXT, -- e.g., "Winter 2024"
  instructor TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(integration_id, lms_course_id)
);

-- Assignments synced from LMS
CREATE TABLE lms_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES lms_courses(id) ON DELETE CASCADE NOT NULL,
  lms_assignment_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  points_possible INTEGER,
  assignment_type TEXT, -- e.g., "Assignment", "Quiz", "Exam"
  is_completed BOOLEAN DEFAULT false,
  lms_url TEXT, -- Direct link to assignment in LMS
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, lms_assignment_id)
);

-- Sync logs for debugging
CREATE TABLE lms_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES lms_integrations(id) ON DELETE CASCADE NOT NULL,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'webhook')),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  message TEXT,
  courses_synced INTEGER DEFAULT 0,
  assignments_synced INTEGER DEFAULT 0,
  sync_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view universities" ON universities FOR SELECT USING (true);
CREATE POLICY "Users can view their own integrations" ON lms_integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own integrations" ON lms_integrations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own courses" ON lms_courses FOR SELECT USING (
  EXISTS (SELECT 1 FROM lms_integrations WHERE id = lms_courses.integration_id AND user_id = auth.uid())
);
CREATE POLICY "Users can view their own assignments" ON lms_assignments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM lms_courses lc
    JOIN lms_integrations li ON li.id = lc.integration_id
    WHERE lc.id = lms_assignments.course_id AND li.user_id = auth.uid()
  )
);
CREATE POLICY "Users can view their own sync logs" ON lms_sync_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM lms_integrations WHERE id = lms_sync_logs.integration_id AND user_id = auth.uid())
);

-- Indexes
CREATE INDEX idx_lms_integrations_user_id ON lms_integrations(user_id);
CREATE INDEX idx_lms_integrations_university_id ON lms_integrations(university_id);
CREATE INDEX idx_lms_courses_integration_id ON lms_courses(integration_id);
CREATE INDEX idx_lms_assignments_course_id ON lms_assignments(course_id);
CREATE INDEX idx_lms_assignments_due_date ON lms_assignments(due_date);
CREATE INDEX idx_lms_sync_logs_integration_id ON lms_sync_logs(integration_id);

-- Insert University of Guelph
INSERT INTO universities (name, domain, lms_type, lms_url) VALUES
('University of Guelph', 'uoguelph.ca', 'd2l', 'https://courselink.uoguelph.ca')
ON CONFLICT (domain) DO NOTHING;
