
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view relevant notifications" ON public.heirway_admin_notifications;

-- Recreate with authenticated role only
CREATE POLICY "Users can view relevant notifications"
ON public.heirway_admin_notifications
FOR SELECT
TO authenticated
USING (
  (is_active = true) AND (
    (target_client_id IS NULL) OR 
    (target_client_id IN (
      SELECT heirway_clients.id
      FROM heirway_clients
      WHERE heirway_clients.user_id = auth.uid()
    ))
  )
);
