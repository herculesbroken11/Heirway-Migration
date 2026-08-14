
CREATE TABLE public.heirway_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.heirway_clients(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,

  -- Section 1: Basic Info
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  preferred_name text,
  date_of_birth date,
  mobile_phone text,
  trust_email text,

  -- Section 2: Spouse
  spouse_full_name text,
  spouse_preferred_name text,
  spouse_dob date,
  spouse_phone text,

  -- Section 3: Dependents
  dependents jsonb DEFAULT '[]'::jsonb,
  additional_dependents jsonb DEFAULT '[]'::jsonb,
  legacy_recipients jsonb DEFAULT '[]'::jsonb,

  -- Section 4: Tax
  cpa_name text,
  cpa_email text,
  cpa_phone text,
  tax_return_types text[] DEFAULT '{}'::text[],
  tax_return_other text,
  last_tax_year text,
  estimated_current_income numeric,
  major_tax_events text,
  expects_inheritance text,
  inheritance_details text,

  -- Section 5: Existing Documents
  existing_documents text[] DEFAULT '{}'::text[],
  estate_plan_last_reviewed date,
  confident_plan_works text,

  -- Section 6: Trust Structure
  trust_name text,
  trust_address_street text,
  trust_address_city text,
  trust_address_state text,
  trust_address_zip text,
  trust_domicile_state text,

  -- Section 7: Trustees
  trustees jsonb DEFAULT '[]'::jsonb,
  managing_trustee_phone text,
  successor_trustees jsonb DEFAULT '[]'::jsonb,

  -- Section 8: Beneficiaries
  beneficiaries jsonb DEFAULT '[]'::jsonb,

  -- Section 9: Goals
  top_priorities text[] DEFAULT '{}'::text[],
  support_preference text,
  biggest_fear text,

  -- Section 10: Confirmation
  confirmed boolean DEFAULT false,

  -- Progress tracking
  current_section integer DEFAULT 1,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.heirway_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own intake" ON public.heirway_intake FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own intake" ON public.heirway_intake FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own intake" ON public.heirway_intake FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all intake" ON public.heirway_intake FOR ALL TO authenticated USING (is_admin());

CREATE TRIGGER update_heirway_intake_updated_at BEFORE UPDATE ON public.heirway_intake FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
