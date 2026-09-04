-- Stripe webhook event idempotency (private schema — not part of public application parity set)

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  attempt_count integer NOT NULL DEFAULT 1,
  first_received_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  last_error text NULL
);

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE private.stripe_webhook_events FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA private TO postgres, service_role;

-- ─── claim_stripe_webhook_event ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  event_id text,
  event_type text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $function$
DECLARE
  v_row private.stripe_webhook_events%ROWTYPE;
  stale_threshold timestamptz := now() - interval '10 minutes';
BEGIN
  BEGIN
    INSERT INTO private.stripe_webhook_events (event_id, event_type, status)
    VALUES (event_id, event_type, 'processing');
    RETURN 'claimed';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  SELECT *
  INTO v_row
  FROM private.stripe_webhook_events
  WHERE stripe_webhook_events.event_id = claim_stripe_webhook_event.event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'stripe_webhook_events row missing after conflict for event_id %', event_id;
  END IF;

  IF v_row.status = 'completed' THEN
    RETURN 'completed';
  END IF;

  IF v_row.status = 'processing' AND v_row.last_attempt_at > stale_threshold THEN
    RETURN 'in_progress';
  END IF;

  UPDATE private.stripe_webhook_events
  SET
    event_type = claim_stripe_webhook_event.event_type,
    status = 'processing',
    attempt_count = v_row.attempt_count + 1,
    last_attempt_at = now(),
    completed_at = NULL,
    last_error = NULL
  WHERE stripe_webhook_events.event_id = claim_stripe_webhook_event.event_id;

  RETURN 'claimed';
END;
$function$;

-- ─── complete_stripe_webhook_event ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.complete_stripe_webhook_event(event_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $function$
BEGIN
  UPDATE private.stripe_webhook_events
  SET
    status = 'completed',
    completed_at = now(),
    last_error = NULL
  WHERE stripe_webhook_events.event_id = complete_stripe_webhook_event.event_id;
END;
$function$;

-- ─── fail_stripe_webhook_event ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fail_stripe_webhook_event(
  event_id text,
  error_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $function$
BEGIN
  UPDATE private.stripe_webhook_events
  SET
    status = 'failed',
    last_attempt_at = now(),
    last_error = left(error_message, 1000)
  WHERE stripe_webhook_events.event_id = fail_stripe_webhook_event.event_id;
END;
$function$;

-- Service-role only RPC surface
REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_stripe_webhook_event(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_stripe_webhook_event(text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_stripe_webhook_event(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_stripe_webhook_event(text, text) TO service_role;
