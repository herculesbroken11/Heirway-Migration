import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const METALS_API_KEY = Deno.env.get("METALS_DEV_API_KEY");
    if (!METALS_API_KEY) {
      throw new Error("METALS_DEV_API_KEY is not configured");
    }

    // Fetch live silver spot price from metals.dev
    const metalsRes = await fetch(
      `https://api.metals.dev/v1/latest?api_key=${METALS_API_KEY}&currency=USD&unit=toz`
    );

    if (!metalsRes.ok) {
      const errText = await metalsRes.text();
      throw new Error(`Metals API error [${metalsRes.status}]: ${errText}`);
    }

    const metalsData = await metalsRes.json();
    const silverPrice = metalsData?.metals?.silver;

    if (!silverPrice || typeof silverPrice !== "number") {
      throw new Error("Could not parse silver price from API response");
    }

    console.log(`Fetched silver spot price: $${silverPrice}/toz`);

    // Update all client records with the new silver spot price
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("heirway_clients")
      .update({ silver_spot_price: silverPrice })
      .neq("silver_spot_price", silverPrice);

    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        silver_price: silverPrice,
        updated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error updating silver price:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
