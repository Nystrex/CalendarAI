-- Create support chats table
CREATE TABLE IF NOT EXISTS support_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'waiting')),
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create support messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES support_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Policies for support_chats
CREATE POLICY "Users can view their own chats"
  ON support_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chats"
  ON support_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
  ON support_chats FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for support_messages
CREATE POLICY "Users can view messages in their chats"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_chats
      WHERE support_chats.id = support_messages.chat_id
      AND support_chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their chats"
  ON support_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_chats
      WHERE support_chats.id = support_messages.chat_id
      AND support_chats.user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

-- Create indexes
CREATE INDEX idx_support_chats_user_id ON support_chats(user_id);
CREATE INDEX idx_support_chats_status ON support_chats(status);
CREATE INDEX idx_support_messages_chat_id ON support_messages(chat_id);
CREATE INDEX idx_support_messages_created_at ON support_messages(created_at);

COMMENT ON TABLE support_chats IS 'Support chat conversations between users and admins';
COMMENT ON TABLE support_messages IS 'Individual messages within support chats';
