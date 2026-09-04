import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, DollarSign } from 'lucide-react';
import type { HeirwayPlanCatalogRow, HeirwayPlanPriceRow } from '@/lib/planCatalogTypes';
import { fetchPlanCatalog, fetchPlanPrices, maskStripePriceId } from '@/lib/planCatalog';

export default function PlanPricesViewer() {
  const [prices, setPrices] = useState<HeirwayPlanPriceRow[]>([]);
  const [catalog, setCatalog] = useState<HeirwayPlanCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [catalogResult, pricesResult] = await Promise.all([
      fetchPlanCatalog(),
      fetchPlanPrices(),
    ]);

    if (catalogResult.error) {
      toast.error('Failed to load catalog: ' + catalogResult.error);
    }
    if (pricesResult.error) {
      toast.error('Failed to load prices: ' + pricesResult.error);
    }

    setCatalog(catalogResult.data);
    setPrices(pricesResult.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const catalogName = (key: string) =>
    catalog.find((row) => row.internal_key === key)?.display_name ?? key;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading Stripe price associations…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Stripe Price Associations (read-only)
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Admin view of verified Stripe Price IDs. Stripe remains authoritative for amounts, currency, and billing intervals.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>

      <div className="grid gap-2">
        {prices.map((price) => (
          <Card key={price.id} className="glass-panel">
            <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <span className="font-medium">{catalogName(price.plan_catalog_key)}</span>
                <Badge variant="outline" className="ml-2 text-[10px]">{price.price_role}</Badge>
                {!price.active && <Badge variant="secondary" className="ml-1 text-[10px]">Inactive</Badge>}
              </div>
              <div className="text-xs text-muted-foreground text-right">
                <span className="font-mono">{maskStripePriceId(price.stripe_price_id)}</span>
                {price.verified_at && (
                  <span className="block text-[10px] mt-0.5">
                    verified {new Date(price.verified_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {prices.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No price rows visible. Admin RLS may be blocking access.
        </p>
      )}
    </div>
  );
}
