import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_MARKETS = ["Mehrauli Market", "Daryaganj Market"];

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getUserStoreId(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("store_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.store_id) return profile.store_id;

  return getOrCreateStoreForUser(user.id);
}

export async function getOrCreateStoreForUser(userId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .insert({ name: "My Store" })
    .select("id")
    .single();

  if (storeError || !store) return null;

  await supabase.from("profiles").insert({
    id: userId,
    store_id: store.id,
    role: "owner",
  });

  await supabase.from("markets").insert(
    DEFAULT_MARKETS.map((name) => ({ store_id: store.id, name }))
  );

  return store.id;
}

export async function requireStoreId(): Promise<string> {
  const storeId = await getUserStoreId();
  if (!storeId) {
    throw new Error(
      "Database not ready. Please run supabase/schema.sql in your Supabase SQL Editor first."
    );
  }
  return storeId;
}

export async function logAudit(
  storeId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  newValue?: Record<string, unknown>
) {
  const user = await getSessionUser();
  const supabase = await createSupabaseServerClient();
  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: user?.id ?? null,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    new_value: newValue ?? null,
  });
}
