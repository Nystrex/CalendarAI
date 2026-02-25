-- Migration to add priority and due_date to todos table
ALTER TABLE todos ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));
ALTER TABLE todos ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Create index for filtering by priority and due date
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(user_id, due_date);
