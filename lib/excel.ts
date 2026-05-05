import * as XLSX from "xlsx";

export interface Person {
  name: string;
  nationalId: string;
  phone?: string;
  email?: string;
}

// قراءة شيت Excel وإرجاع array
export function readExcel(file: File): Promise<Person[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

        // أول سطر هيدر، باقي الصفوف بيانات
        const people: Person[] = rows
          .slice(1)
          .map((row: any) => ({
            name: String(row[0] || "").trim(),
            nationalId: String(row[1] || "").trim(),
            phone: row[2] ? String(row[2]) : undefined,
            email: row[3] ? String(row[3]) : undefined,
          }))
          .filter((p) => p.name && p.nationalId);

        resolve(people);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => {
      console.error("FileReader error:", err);
      reject(new Error("تعذر قراءة الملف. قد يكون الملف تالفاً أو مستخدماً من قبل برنامج آخر."));
    };
    reader.readAsArrayBuffer(file);
  });
}

// كتابة Excel وتحميله
export function downloadExcel(people: Person[], filename: string) {
  const rows = [
    ["الاسم", "الرقم القومي", "رقم التواصل", "الإيميل"],
    ...people.map((p) => [p.name, p.nationalId, p.phone || "", p.email || ""]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "المقبولون");
  XLSX.writeFile(wb, filename);
}
