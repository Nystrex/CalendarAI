-- Create homework_chat_history table
CREATE TABLE IF NOT EXISTS homework_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_homework_chat_user_id ON homework_chat_history(user_id);
CREATE INDEX idx_homework_chat_conversation_id ON homework_chat_history(conversation_id);
CREATE INDEX idx_homework_chat_created_at ON homework_chat_history(created_at DESC);

-- Enable RLS
ALTER TABLE homework_chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own chat history
CREATE POLICY "Users can view own homework chat history"
  ON homework_chat_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own messages
CREATE POLICY "Users can insert own homework chat messages"
  ON homework_chat_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own messages
CREATE POLICY "Users can delete own homework chat messages"
  ON homework_chat_history
  FOR DELETE
  USING (auth.uid() = user_id);
