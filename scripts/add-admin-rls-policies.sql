-- Add RLS policies for admin to view all data

-- Allow admin to view all profiles
CREATE POLICY "Admin can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'mohammedcacouni@gmail.com'
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND email = 'mohammedcacouni@gmail.com'
  )
);

-- Allow admin to view all calendars
CREATE POLICY "Admin can view all calendars"
ON public.calendars
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND email = 'mohammedcacouni@gmail.com'
  )
);

-- Allow admin to view all events
CREATE POLICY "Admin can view all events"
ON public.events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND email = 'mohammedcacouni@gmail.com'
  )
);

-- Allow admin to view all oauth connections
CREATE POLICY "Admin can view all oauth connections"
ON public.oauth_connections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND email = 'mohammedcacouni@gmail.com'
  )
);

-- Allow admin to view all audit logs
CREATE POLICY "Admin can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND email = 'mohammedcacouni@gmail.com'
  )
);
