-- Create support_chats table
CREATE TABLE IF NOT EXISTS support_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES support_chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'admin')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_support_chats_user_id ON support_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_support_chats_status ON support_chats(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_chat_id ON support_messages(chat_id);

-- Enable RLS
ALTER TABLE support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_chats
CREATE POLICY "Users can view their own chats" ON support_chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chats" ON support_chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" ON support_chats
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies (admins can see all chats)
CREATE POLICY "Admins can view all chats" ON support_chats
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for support_messages
CREATE POLICY "Users can view messages from their chats" ON support_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM support_chats WHERE id = chat_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create messages in their chats" ON support_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM support_chats WHERE id = chat_id AND user_id = auth.uid())
  );

-- Admin policies for messages
CREATE POLICY "Admins can manage all messages" ON support_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Add phone_number column to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Enable realtime for support tables
ALTER PUBLICATION supabase_realtime ADD TABLE support_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
