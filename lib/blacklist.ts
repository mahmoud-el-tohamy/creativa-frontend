import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
  orderBy,
} from "firebase/firestore";

export interface BlacklistEntry {
  id?: string;
  name: string;
  nationalId: string;
  addedAt: Date;
}

// إضافة شخص
export async function addToBlacklist(
  entry: Omit<BlacklistEntry, "id" | "addedAt">,
) {
  return await addDoc(collection(db, "blacklist"), {
    ...entry,
    addedAt: Timestamp.now(),
  });
}

// جلب الكل
export async function getBlacklist(): Promise<BlacklistEntry[]> {
  const q = query(collection(db, "blacklist"), orderBy("addedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<BlacklistEntry, "id">),
    addedAt: d.data().addedAt.toDate(),
  }));
}

// حذف
export async function removeFromBlacklist(id: string) {
  await deleteDoc(doc(db, "blacklist", id));
}

// حذف التلقائي بعد 4 شهور (يتنفذ عند كل فتح للصفحة)
export async function cleanupExpired() {
  const fourMonthsAgo = new Date();
  fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

  const q = query(
    collection(db, "blacklist"),
    where("addedAt", "<", Timestamp.fromDate(fourMonthsAgo)),
  );
  const snapshot = await getDocs(q);
  const deletions = snapshot.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletions);
}

// إضافة متعددة دفعة واحدة
export async function addManyToBlacklist(
  entries: Omit<BlacklistEntry, "id" | "addedAt">[],
) {
  const promises = entries.map((e) => addToBlacklist(e));
  await Promise.all(promises);
}

// جلب Set من الـ nationalIds للمقارنة السريعة
export async function getBlacklistIds(): Promise<Set<string>> {
  const list = await getBlacklist();
  return new Set(list.map((e) => e.nationalId));
}
