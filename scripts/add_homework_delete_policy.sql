-- Add DELETE policy for homework_chat_history table
-- This allows users to delete their own chat messages

CREATE POLICY "Users can delete own homework chat messages"
  ON homework_chat_history
  FOR DELETE
  USING (auth.uid() = user_id);
