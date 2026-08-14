
-- 1. Remove user delete policy on meeting minutes (admin-only delete)
DROP POLICY IF EXISTS "Users can delete own minutes" ON public.heirway_meeting_minutes;

-- 2. Add minute_number column to meeting minutes
ALTER TABLE public.heirway_meeting_minutes ADD COLUMN IF NOT EXISTS minute_number integer;

-- 3. Add annual_meeting_date to trust progress
ALTER TABLE public.heirway_trust_progress ADD COLUMN IF NOT EXISTS annual_meeting_date date;

-- 4. Create admin notifications table
CREATE TABLE IF NOT EXISTS public.heirway_admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  notification_type text NOT NULL DEFAULT 'reminder',
  is_active boolean NOT NULL DEFAULT true,
  target_client_id uuid REFERENCES public.heirway_clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_by uuid NOT NULL
);

ALTER TABLE public.heirway_admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admin can manage all notifications
CREATE POLICY "Admins can manage all notifications"
  ON public.heirway_admin_notifications
  FOR ALL
  USING (is_admin());

-- Users can view active notifications targeting them or all clients
CREATE POLICY "Users can view relevant notifications"
  ON public.heirway_admin_notifications
  FOR SELECT
  USING (
    is_active = true
    AND (target_client_id IS NULL OR target_client_id IN (
      SELECT id FROM public.heirway_clients WHERE user_id = auth.uid()
    ))
  );
