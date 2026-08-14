-- 1. Add opt_in column to contact_messages
ALTER TABLE public.contact_messages
ADD COLUMN IF NOT EXISTS opt_in boolean NOT NULL DEFAULT false;

-- 2. Ensure pg_net is available for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 3. Trigger function: sync new prospect to GHL
CREATE OR REPLACE FUNCTION public.sync_prospect_to_ghl()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://aepubshqohzdgpclltqb.supabase.co/functions/v1/ghl-sync',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'source', 'prospect',
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block inserts if sync fails
  RETURN NEW;
END;
$$;

-- 4. Trigger function: sync new contact_message to GHL
CREATE OR REPLACE FUNCTION public.sync_contact_message_to_ghl()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://aepubshqohzdgpclltqb.supabase.co/functions/v1/ghl-sync',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'source', 'contact_message',
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- 5. Attach triggers
DROP TRIGGER IF EXISTS trg_sync_prospect_to_ghl ON public.prospects;
CREATE TRIGGER trg_sync_prospect_to_ghl
AFTER INSERT ON public.prospects
FOR EACH ROW EXECUTE FUNCTION public.sync_prospect_to_ghl();

DROP TRIGGER IF EXISTS trg_sync_contact_message_to_ghl ON public.contact_messages;
CREATE TRIGGER trg_sync_contact_message_to_ghl
AFTER INSERT ON public.contact_messages
FOR EACH ROW EXECUTE FUNCTION public.sync_contact_message_to_ghl();