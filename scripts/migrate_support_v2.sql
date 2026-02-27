-- Run this in Supabase SQL Editor to migrate to support system v2

-- Drop old tables if they exist (backup first!)
-- DROP TABLE IF EXISTS support_messages;
-- DROP TABLE IF EXISTS support_chats;

-- Create support_chats table with better structure
CREATE TABLE IF NOT EXISTS support_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  admin_notes TEXT
);

-- Create support_messages table with improved fields
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES support_chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'admin', 'system')),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_chats_user_id ON support_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_support_chats_status ON support_chats(status);
CREATE INDEX IF NOT EXISTS idx_support_chats_updated_at ON support_chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_chat_id ON support_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);

-- Enable RLS
ALTER TABLE support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their own chats" ON support_chats;
DROP POLICY IF EXISTS "Users can create their own chats" ON support_chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON support_chats;
DROP POLICY IF EXISTS "Admins can view all chats" ON support_chats;
DROP POLICY IF EXISTS "Users can view messages from their chats" ON support_messages;
DROP POLICY IF EXISTS "Users can create messages in their chats" ON support_messages;
DROP POLICY IF EXISTS "Admins can manage all messages" ON support_messages;

-- RLS Policies for support_chats
CREATE POLICY "Users can view their own chats" ON support_chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chats" ON support_chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own open chats" ON support_chats
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND status != 'archived'
  );

-- Admin policies (admins can see all chats)
CREATE POLICY "Admins can view all chats" ON support_chats
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all chats" ON support_chats
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for support_messages
CREATE POLICY "Users can view messages from their chats" ON support_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM support_chats WHERE id = chat_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create messages in their open chats" ON support_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'user'
    AND EXISTS (
      SELECT 1 FROM support_chats 
      WHERE id = chat_id 
      AND user_id = auth.uid()
      AND status = 'open'
    )
  );

CREATE POLICY "Users can mark messages as read" ON support_messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM support_chats WHERE id = chat_id AND user_id = auth.uid())
  );

-- Admin policies for messages
CREATE POLICY "Admins can view all messages" ON support_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can create messages" ON support_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'admin'
    AND EXISTS (
      SELECT 1 FROM support_chats 
      WHERE id = chat_id
      AND status = 'open'
    )
  );

CREATE POLICY "Admins can update messages" ON support_messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Function to update chat's updated_at and last_message_at
CREATE OR REPLACE FUNCTION update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_chats 
  SET updated_at = NOW(), 
      last_message_at = NEW.created_at
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update chat timestamp on new message
DROP TRIGGER IF EXISTS update_chat_on_message ON support_messages;
CREATE TRIGGER update_chat_on_message
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_timestamp();

-- Function to update closed_at when status changes to closed
CREATE OR REPLACE FUNCTION update_closed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.closed_at = NOW();
  END IF;
  IF NEW.status = 'open' AND OLD.status != 'open' THEN
    NEW.closed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update closed_at
DROP TRIGGER IF EXISTS update_closed_at_trigger ON support_chats;
CREATE TRIGGER update_closed_at_trigger
  BEFORE UPDATE ON support_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_closed_at();

-- Ensure profiles has role column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Enable realtime for support tables
ALTER PUBLICATION supabase_realtime ADD TABLE support_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;

-- Create view for admin to see chat summary with unread count
CREATE OR REPLACE VIEW support_chat_summary AS
SELECT 
  c.id,
  c.user_id,
  c.subject,
  c.status,
  c.priority,
  c.created_at,
  c.updated_at,
  c.last_message_at,
  c.closed_at,
  c.admin_notes,
  p.full_name as user_name,
  p.email as user_email,
  COUNT(CASE WHEN m.sender_role = 'user' AND m.is_read = false THEN 1 END) as unread_user_messages,
  COUNT(CASE WHEN m.sender_role = 'admin' THEN 1 END) as admin_reply_count,
  (
    SELECT content 
    FROM support_messages 
    WHERE chat_id = c.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) as last_message_preview
FROM support_chats c
LEFT JOIN profiles p ON p.id = c.user_id
LEFT JOIN support_messages m ON m.chat_id = c.id
GROUP BY c.id, p.full_name, p.email
ORDER BY c.updated_at DESC;
