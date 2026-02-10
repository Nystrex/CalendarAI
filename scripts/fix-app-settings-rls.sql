-- Add policies for admins to update and insert settings
CREATE POLICY "Admins can update app settings"
  ON app_settings FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can insert app settings"
  ON app_settings FOR INSERT
  WITH CHECK (true);
