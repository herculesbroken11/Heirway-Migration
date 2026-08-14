-- 1. Document templates: admin only
DROP POLICY IF EXISTS "Authenticated can view active templates" ON public.heirway_document_templates;

-- 2. Intake videos: admins or users with a client record
DROP POLICY IF EXISTS "Users can view intake videos" ON public.heirway_intake_videos;
CREATE POLICY "Clients and admins can view intake videos"
ON public.heirway_intake_videos
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (SELECT 1 FROM public.heirway_clients c WHERE c.user_id = auth.uid())
);

-- 3. Thread access via email requires a verified email claim
CREATE OR REPLACE FUNCTION public.user_can_access_message_thread(_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.message_thread_participants p
      WHERE p.thread_id = _thread_id
        AND (
          p.user_id = auth.uid()
          OR (
            coalesce((auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean, false)
            AND lower(p.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
            AND nullif(trim(coalesce((auth.jwt() ->> 'email'), '')), '') IS NOT NULL
          )
        )
    )
$function$;

-- 4. Trust access requests: signed-in users only
DROP POLICY IF EXISTS "Admins can manage all access requests" ON public.trust_access_requests;
DROP POLICY IF EXISTS "Requesters can create and view own requests" ON public.trust_access_requests;
DROP POLICY IF EXISTS "Trustees can view requests for their trusts" ON public.trust_access_requests;

CREATE POLICY "Admins can manage all access requests"
ON public.trust_access_requests FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Requesters can manage own requests"
ON public.trust_access_requests FOR ALL TO authenticated
USING (requested_by = auth.uid()) WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Trustees can view requests for their trusts"
ON public.trust_access_requests FOR SELECT TO authenticated
USING (
  trust_id IN (
    SELECT tm.trust_id FROM public.trust_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.member_type = ANY (ARRAY['trustee_manager'::text, 'trustee'::text])
  )
);

-- 5. Revoke direct EXECUTE on internal SECURITY DEFINER routines
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_message_thread() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_thread_for_contact_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.compute_member_billable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_prospect_to_ghl() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_contact_message_to_ghl() FROM PUBLIC, anon, authenticated;

-- Role helpers: needed by RLS for signed-in users, not by anonymous visitors
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_can_access_message_thread(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_access_message_thread(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;