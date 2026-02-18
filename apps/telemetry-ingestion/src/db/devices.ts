import { getSupabaseAdminClient } from "./supabase";

export type DeviceIdMap = Map<string, string>;

type CachedDevice = { id: string; cachedAt: number };

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CachedDevice>();

const isCacheValid = (entry: CachedDevice, now: number) => now - entry.cachedAt < CACHE_TTL_MS;

export const ensureDevicesExist = async (deviceUids: string[]): Promise<DeviceIdMap> => {
  const uniqueUids = Array.from(new Set(deviceUids.filter(Boolean)));
  const now = Date.now();

  const result: DeviceIdMap = new Map();
  const toFetch: string[] = [];

  for (const uid of uniqueUids) {
    const cached = cache.get(uid);
    if (cached && isCacheValid(cached, now)) {
      result.set(uid, cached.id);
    } else {
      toFetch.push(uid);
    }
  }

  if (toFetch.length === 0) return result;

  const client = getSupabaseAdminClient();

  const insertRows = toFetch.map(device_uid => ({
    device_uid,
    name: device_uid,
    device_type: "esp32",
    is_active: true,
    metadata: {}
  }));

  const upsertResult = await client
    .from("devices")
    .upsert(insertRows, { onConflict: "device_uid" });

  if (upsertResult.error) {
    throw new Error(`Failed to upsert devices: ${upsertResult.error.message}`);
  }

  const selectResult = await client
    .from("devices")
    .select("id, device_uid")
    .in("device_uid", toFetch);

  if (selectResult.error || !selectResult.data) {
    throw new Error(`Failed to select devices: ${selectResult.error?.message ?? "unknown error"}`);
  }

  for (const row of selectResult.data) {
    if (!row.device_uid || !row.id) continue;
    cache.set(row.device_uid, { id: row.id, cachedAt: now });
    result.set(row.device_uid, row.id);
  }

  const missing = toFetch.filter(uid => !result.has(uid));
  if (missing.length) {
    throw new Error(`Missing device ids after upsert: ${missing.join(", ")}`);
  }

  return result;
};
