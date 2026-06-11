import { blacklistAPI, BlacklistEntry } from "./api";
export type { BlacklistEntry };

export async function addToBlacklist(entry: { name: string; nationalId: string; notes?: string; trackName?: string }): Promise<void> {
  await blacklistAPI.addSingle({
    name: entry.name,
    nationalId: entry.nationalId,
    notes: entry.notes || "",
    trackName: entry.trackName || "غير محدد",
  });
}

export async function addManyToBlacklist(
  absentees: { name: string; nationalId: string; notes?: string }[],
  attendeesNationalIds: string[],
  trackName: string
): Promise<{ added: number; cleared: number; upgraded: number }> {
  const res = await blacklistAPI.bulkAdd({
    absentees: absentees.map(e => ({
      name: e.name,
      nationalId: e.nationalId,
      notes: e.notes || "",
    })),
    attendeesNationalIds,
    trackName
  });
  return { added: res.data.added, cleared: res.data.cleared, upgraded: res.data.upgraded };
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

export async function bulkCheckBlacklist(nationalIds: string[]): Promise<Record<string, { status: string; warningsCount: number }>> {
  if (!nationalIds || nationalIds.length === 0) return {};
  const res = await blacklistAPI.bulkCheck(nationalIds);
  return res.data.data;
}
