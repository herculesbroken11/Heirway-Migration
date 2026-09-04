import { supabase } from '@/integrations/supabase/client';
import type {
  HeirwayPlanCatalogRow,
  HeirwayPlanPriceRow,
  PlanCatalogEditableFields,
  PlanEntitlementFields,
} from '@/lib/planCatalogTypes';

const CATALOG_SELECT = '*';

export async function fetchPlanCatalog(): Promise<{
  data: HeirwayPlanCatalogRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('heirway_plan_catalog')
    .select(CATALOG_SELECT)
    .order('sort_order', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }
  return { data: (data as HeirwayPlanCatalogRow[]) ?? [], error: null };
}

export async function fetchActivePlanCatalog(): Promise<{
  data: HeirwayPlanCatalogRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('heirway_plan_catalog')
    .select(CATALOG_SELECT)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }
  return { data: (data as HeirwayPlanCatalogRow[]) ?? [], error: null };
}

export async function fetchOfferedPlanCatalog(): Promise<{
  data: HeirwayPlanCatalogRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('heirway_plan_catalog')
    .select(CATALOG_SELECT)
    .eq('active', true)
    .eq('offered', true)
    .order('sort_order', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }
  return { data: (data as HeirwayPlanCatalogRow[]) ?? [], error: null };
}

/** Admin-only — RLS requires is_admin() */
export async function fetchPlanPrices(): Promise<{
  data: HeirwayPlanPriceRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('heirway_plan_prices')
    .select('*')
    .order('plan_catalog_key', { ascending: true })
    .order('price_role', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }
  return { data: (data as HeirwayPlanPriceRow[]) ?? [], error: null };
}

export function lookupByInternalKey(
  catalog: HeirwayPlanCatalogRow[],
  internalKey: string,
): HeirwayPlanCatalogRow | undefined {
  return catalog.find((row) => row.internal_key === internalKey);
}

export function lookupByStripeCheckoutKey(
  catalog: HeirwayPlanCatalogRow[],
  checkoutKey: string,
): HeirwayPlanCatalogRow | undefined {
  return catalog.find((row) => row.stripe_checkout_key === checkoutKey);
}

export function lookupBySelectedPlanKey(
  catalog: HeirwayPlanCatalogRow[],
  selectedPlanKey: string,
): HeirwayPlanCatalogRow | undefined {
  return catalog.find((row) => row.selected_plan_key === selectedPlanKey);
}

/** Future checkout helper — maps checkout metadata package_id to catalog row */
export function resolveCatalogForCheckoutKey(
  catalog: HeirwayPlanCatalogRow[],
  checkoutKey: string,
): HeirwayPlanCatalogRow | undefined {
  return lookupByStripeCheckoutKey(catalog, checkoutKey);
}

export async function updatePlanCatalogRow(
  internalKey: string,
  fields: PlanCatalogEditableFields,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('heirway_plan_catalog')
    .update(fields)
    .eq('internal_key', internalKey);

  return { error: error?.message ?? null };
}

/**
 * Admin-only entitlement update — mutates client_portal_tier and content_access_keys only.
 * Identifies row by immutable internal_key. No silent normalization of selected keys.
 */
export async function updatePlanEntitlements(
  internalKey: string,
  fields: PlanEntitlementFields,
): Promise<{ data: HeirwayPlanCatalogRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('heirway_plan_catalog')
    .update({
      client_portal_tier: fields.client_portal_tier,
      content_access_keys: fields.content_access_keys,
    })
    .eq('internal_key', internalKey)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as HeirwayPlanCatalogRow, error: null };
}

/** Selectable content entitlement keys — all catalog internal_key values with display labels */
export function getContentAccessKeyOptions(
  catalog: HeirwayPlanCatalogRow[],
): Array<{ key: string; displayName: string }> {
  return [...catalog]
    .sort((a, b) => a.sort_order - b.sort_order || a.internal_key.localeCompare(b.internal_key))
    .map((row) => ({
      key: row.internal_key,
      displayName: row.display_name,
    }));
}

export function entitlementArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

export function maskStripePriceId(priceId: string): string {
  if (priceId.length <= 12) return priceId;
  return `${priceId.slice(0, 8)}…${priceId.slice(-4)}`;
}
