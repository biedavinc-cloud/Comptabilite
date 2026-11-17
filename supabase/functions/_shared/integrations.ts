// Shared integration-vault helper for every Edge Function.
//
// Secrets are read FIRST from the platform_integrations table (managed by
// Super Admin > Intégrations, readable only with the service_role key),
// THEN from the classic Supabase Edge Function secrets (Deno.env) as a
// fallback — so every PSP that already works in production keeps working
// unchanged until a super admin decides to paste a key in the back office.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.110.7";

export interface IntegrationRow {
  provider: string;
  enabled: boolean;
  mode: "test" | "live";
  public_config: Record<string, string>;
  secret_config: Record<string, string>;
}

const cache = new Map<string, { at: number; row: IntegrationRow | null }>();
const TTL_MS = 30_000;

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

export async function getIntegration(provider: string): Promise<IntegrationRow | null> {
  const hit = cache.get(provider);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.row;
  try {
    const { data } = await serviceClient()
      .from("platform_integrations")
      .select("provider, enabled, mode, public_config, secret_config")
      .eq("provider", provider)
      .maybeSingle();
    const row = (data as IntegrationRow | null) ?? null;
    cache.set(provider, { at: Date.now(), row });
    return row;
  } catch {
    return null;
  }
}

/**
 * Returns a secret: vault value (platform_integrations.secret_config[key])
 * if set, otherwise the Edge Function env var `envName`, otherwise undefined.
 */
export async function getSecret(provider: string, key: string, envName?: string): Promise<string | undefined> {
  const row = await getIntegration(provider);
  const fromVault = row?.secret_config?.[key];
  if (fromVault && String(fromVault).trim() !== "") return String(fromVault).trim();
  if (envName) {
    const fromEnv = Deno.env.get(envName);
    if (fromEnv && fromEnv.trim() !== "") return fromEnv.trim();
  }
  return undefined;
}

export async function getPublic(provider: string, key: string, fallback?: string): Promise<string | undefined> {
  const row = await getIntegration(provider);
  const v = row?.public_config?.[key];
  return v && String(v).trim() !== "" ? String(v).trim() : fallback;
}

export async function getMode(provider: string, envName?: string): Promise<"test" | "live"> {
  const row = await getIntegration(provider);
  // The vault's mode only wins once keys were actually pasted in the
  // back office; otherwise keep the historical env behaviour exactly
  // (PAYUNIT_MODE unset used to mean "test").
  const vaultInUse = row && Object.keys(row.secret_config ?? {}).length > 0;
  if (vaultInUse && row?.mode) return row.mode;
  const env = envName ? Deno.env.get(envName) : undefined;
  if (!env) return "test";
  return env.toLowerCase() === "live" ? "live" : "test";
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

export async function logFunctionError(functionName: string, error: unknown, context: Record<string, unknown> = {}) {
  try {
    const message = error instanceof Error ? error.message : String(error);
    await serviceClient().from("function_errors").insert({
      function_name: functionName,
      tenant_id: (context.tenant_id as string) ?? null,
      message: message.slice(0, 2000),
      context,
    });
  } catch {
    // never throw from the logger
  }
}

// ---- Plans: single source of truth for the new PSP functions ----
export const PLAN_PRICE_USD: Record<string, number> = { starter: 14, pro: 29, premium: 79, enterprise: 199 };
export const ANNUAL_DISCOUNT = 0.20;
export function usdPriceForCycle(plan: string, cycle: "monthly" | "annual"): number {
  const monthly = PLAN_PRICE_USD[plan];
  if (!monthly) throw new Error(`Unknown plan: ${plan}`);
  return cycle === "annual" ? Math.round(monthly * 12 * (1 - ANNUAL_DISCOUNT)) : monthly;
}

/** Latest platform FX rate USD→currency (fx_rates, tenant_id IS NULL). */
export async function usdTo(currency: string, fallback: number): Promise<number> {
  if (currency === "USD") return 1;
  const { data } = await serviceClient()
    .from("fx_rates").select("rate")
    .is("tenant_id", null).eq("currency_from", "USD").eq("currency_to", currency)
    .order("rate_date", { ascending: false }).limit(1).maybeSingle();
  return Number(data?.rate) > 0 ? Number(data!.rate) : fallback;
}

/** Authenticated user + check that they administer tenant_id. */
export async function requireTenantAdmin(req: Request, tenantId: string): Promise<{ user?: { id: string; email?: string }; error?: Response }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await anon.auth.getUser();
  if (!user) return { error: json({ error: "Unauthorized" }, 401) };
  const { data: membership } = await serviceClient()
    .from("tenant_users").select("role, is_owner").eq("tenant_id", tenantId).eq("user_id", user.id).maybeSingle();
  if (!membership || (membership.role !== "admin" && !membership.is_owner)) {
    return { error: json({ error: "Only a tenant admin can manage billing" }, 403) };
  }
  return { user };
}

/** Activates/extends the plan once a payment has been atomically claimed. */
export async function activatePlan(tenantId: string, plan: string, cycle: "monthly" | "annual", lockedUsd: number) {
  const cycleDays = cycle === "annual" ? 365 : 30;
  await serviceClient().from("tenants").update({
    plan,
    subscription_status: "active",
    billing_cycle: cycle,
    locked_price_usd: lockedUsd,
    auto_renew: false,
    next_billing_date: new Date(Date.now() + cycleDays * 86_400_000).toISOString().slice(0, 10),
  }).eq("id", tenantId);
}

export async function hmacHex(algo: "SHA-256" | "SHA-512", secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: algo }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
