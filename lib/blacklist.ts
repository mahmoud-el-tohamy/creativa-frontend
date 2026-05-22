import { blacklistAPI, BlacklistEntry } from "./api";
export type { BlacklistEntry };

export async function addToBlacklist(entry: Omit<BlacklistEntry, "id" | "addedAt" | "addedBy" | "addedByName" | "expiresAt" | "isExpired">): Promise<void> {
  await blacklistAPI.addSingle({
    name: entry.name,
    nationalId: entry.nationalId,
    notes: entry.notes || "",
  });
}

export async function addManyToBlacklist(
  entries: Omit<BlacklistEntry, "id" | "addedAt" | "addedBy" | "addedByName" | "expiresAt" | "isExpired">[]
): Promise<{ added: number; skipped: number }> {
  const res = await blacklistAPI.bulkAdd(
    entries.map(e => ({
      name: e.name,
      nationalId: e.nationalId,
      notes: e.notes || "",
    }))
  );
  return { added: res.data.added, skipped: res.data.skipped };
}

export async function getBlacklist(params?: Record<string, unknown>): Promise<BlacklistEntry[]> {
  const res = await blacklistAPI.list(params);
  // Map _id to id for UI compatibility
  return res.data.data.map((e) => ({
    ...e,
    id: e._id || e.id,
  }));
}

export async function removeFromBlacklist(id: string): Promise<void> {
  await blacklistAPI.remove(id);
}

export async function cleanupExpired(): Promise<number> {
  const res = await blacklistAPI.cleanup();
  return res.data.deleted;
}

export async function getBlacklistIds(): Promise<Set<string>> {
  return blacklistAPI.getIds();
}

export async function isBlacklisted(nationalId: string): Promise<boolean> {
  const res = await blacklistAPI.check(nationalId);
  return res.data.isBlacklisted;
}
