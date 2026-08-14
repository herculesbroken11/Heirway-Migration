
-- Trust members table - tracks invited trustees and beneficiaries per trust
CREATE TABLE public.trust_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id uuid NOT NULL REFERENCES public.heirway_trust_progress(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.heirway_clients(id) ON DELETE CASCADE,
  user_id uuid DEFAULT NULL,
  member_type text NOT NULL CHECK (member_type IN ('trustee_manager', 'trustee', 'beneficiary')),
  power_level text NOT NULL DEFAULT 'none' CHECK (power_level IN ('full', 'limited', 'none')),
  invite_email text,
  invite_status text NOT NULL DEFAULT 'pending' CHECK (invite_status IN ('pending', 'accepted', 'expired')),
  invite_token uuid DEFAULT gen_random_uuid(),
  invited_by uuid DEFAULT NULL,
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  is_billable boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Access requests from beneficiaries/trustees
CREATE TABLE public.trust_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id uuid NOT NULL REFERENCES public.heirway_trust_progress(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('meeting_minutes', 'documents', 'trust_details', 'asset_tracker')),
  resource_id uuid,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Individual trustee approvals for access requests
CREATE TABLE public.trust_access_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.trust_access_requests(id) ON DELETE CASCADE,
  trustee_member_id uuid NOT NULL REFERENCES public.trust_members(id) ON DELETE CASCADE,
  trustee_user_id uuid NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS for trust_members
ALTER TABLE public.trust_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all trust members"
  ON public.trust_members FOR ALL
  USING (is_admin());

CREATE POLICY "Trust owners can manage their trust members"
  ON public.trust_members FOR ALL
  USING (
    client_id IN (SELECT id FROM public.heirway_clients WHERE user_id = auth.uid())
  )
  WITH CHECK (
    client_id IN (SELECT id FROM public.heirway_clients WHERE user_id = auth.uid())
  );

CREATE POLICY "Invited users can view their own memberships"
  ON public.trust_members FOR SELECT
  USING (user_id = auth.uid());

-- RLS for trust_access_requests
ALTER TABLE public.trust_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all access requests"
  ON public.trust_access_requests FOR ALL
  USING (is_admin());

CREATE POLICY "Requesters can create and view own requests"
  ON public.trust_access_requests FOR ALL
  USING (requested_by = auth.uid())
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Trustees can view requests for their trusts"
  ON public.trust_access_requests FOR SELECT
  USING (
    trust_id IN (
      SELECT trust_id FROM public.trust_members 
      WHERE user_id = auth.uid() AND member_type IN ('trustee_manager', 'trustee')
    )
  );

-- RLS for trust_access_approvals
ALTER TABLE public.trust_access_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all approvals"
  ON public.trust_access_approvals FOR ALL
  USING (is_admin());

CREATE POLICY "Trustees can manage their own approvals"
  ON public.trust_access_approvals FOR ALL
  USING (trustee_user_id = auth.uid())
  WITH CHECK (trustee_user_id = auth.uid());

CREATE POLICY "Requesters can view approvals on their requests"
  ON public.trust_access_approvals FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM public.trust_access_requests WHERE requested_by = auth.uid()
    )
  );

-- Updated_at triggers
CREATE TRIGGER update_trust_members_updated_at
  BEFORE UPDATE ON public.trust_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trust_access_requests_updated_at
  BEFORE UPDATE ON public.trust_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for access requests (for live approval notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.trust_access_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trust_access_approvals;
