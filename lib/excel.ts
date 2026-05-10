import * as XLSX from "xlsx";
import { validateNationalId } from "./validation";

export interface Person {
  name: string;
  nationalId: string;
  phone?: string;
  email?: string;
}

export interface MultiDayAttendancePerson {
  name: string;
  id: string;
  nationalId: string;
  invalidReason?: string;
}

export interface MultiDayAttendanceSummaryRow extends MultiDayAttendancePerson {
  attendedDays: number;
}

const MULTI_DAY_COLUMN_ALIASES = {
  name: ["name", "full name", "fullname", "trainee name", "الاسم", "اسم"],
  id: ["id", "trainee id", "student id", "code", "الكود", "الرقم", "رقم"],
  nationalId: ["national id", "nationalid", "nid", "الرقم القومي", "رقم قومي"],
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function findMatchingColumn(headers: string[], aliases: string[]) {
  return headers.find((header) => aliases.includes(normalizeHeader(header)));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

// قراءة شيت Excel وإرجاع array
export async function readExcel(file: File): Promise<Person[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

    // أول سطر هيدر، باقي الصفوف بيانات
    const people: Person[] = rows
      .slice(1)
      .map((row) => ({
        name: String(row[0] || "").trim(),
        nationalId: String(row[1] || "").trim(),
        phone: row[2] ? String(row[2]) : undefined,
        email: row[3] ? String(row[3]) : undefined,
      }))
      .filter((p) => p.name && p.nationalId);

    return people;
  } catch (err: unknown) {
    console.error("Excel processing error:", err);

    let message = "تعذر قراءة الملف. يرجى التأكد من أن الملف غير مفتوح في برنامج آخر.";
    if (err instanceof DOMException && err.name === "NotReadableError") {
      message = "الملف غير قابل للقراءة. تأكد من إغلاقه في البرامج الأخرى (مثل إكسيل) قبل رفعه.";
    } else if (err instanceof Error && err.message.includes("corrupt")) {
      message = "يبدو أن الملف تالف. يرجى المحاولة باستخدام ملف آخر.";
    }

    throw new Error(message);
  }
}

export async function readMultiDayAttendanceExcel(
  file: File,
): Promise<MultiDayAttendancePerson[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      throw new Error("لم يتم العثور على أي Sheet داخل الملف.");
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    if (rows.length === 0) {
      throw new Error("الملف لا يحتوي على أي بيانات.");
    }

    const headers = Object.keys(rows[0]);
    const nameKey = findMatchingColumn(headers, MULTI_DAY_COLUMN_ALIASES.name);
    const idKey = findMatchingColumn(headers, MULTI_DAY_COLUMN_ALIASES.id);
    const nationalIdKey = findMatchingColumn(
      headers,
      MULTI_DAY_COLUMN_ALIASES.nationalId,
    );

    if (!nameKey || !idKey || !nationalIdKey) {
      throw new Error(
        "صيغة الأعمدة غير صحيحة. الأعمدة المطلوبة هي: Name, ID, National ID.",
      );
    }

    const people = rows
      .map((row) => {
        const nid = String(row[nationalIdKey] ?? "").trim();
        const validation = validateNationalId(nid);
        
        return {
          name: String(row[nameKey] ?? "").trim(),
          id: String(row[idKey] ?? "").trim(),
          nationalId: nid,
          invalidReason: validation.isValid ? undefined : validation.reason,
        };
      })
      .filter((person) => person.name || person.id || person.nationalId)
      .filter((person) => person.name && person.id && person.nationalId);

    if (people.length === 0) {
      throw new Error("لم يتم العثور على أي سجلات مكتملة داخل الملف.");
    }

    return people;
  } catch (err: unknown) {
    console.error("Multi-day attendance Excel processing error:", err);

    let message = getErrorMessage(
      err,
      "تعذر قراءة الملف. يرجى التأكد من صحة الملف وصيغة الأعمدة.",
    );

    if (err instanceof DOMException && err.name === "NotReadableError") {
      message =
        "الملف غير قابل للقراءة. تأكد من إغلاقه في البرامج الأخرى قبل رفعه.";
    }

    throw new Error(message);
  }
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

export function downloadMultiDayAttendanceExcel(
  rows: MultiDayAttendanceSummaryRow[],
  filename: string,
) {
  const data = [
    ["Name", "ID", "National ID", "Attended Days"],
    ...rows.map((person) => [
      person.name,
      person.id,
      person.nationalId,
      person.attendedDays,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [
    { wch: 30 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clean Sheet");
  XLSX.writeFile(wb, filename);
}

export function downloadStyledExcel(params: {
  data: (string | number)[][];
  sheetName: string;
  filename: string;
  rowColors: { odd: string; even: string };
}): void {
  const { data, sheetName, filename, rowColors } = params;

  const ws = XLSX.utils.aoa_to_sheet(data);

  // RTL direction
  ws["!dir"] = "rtl";

  // Auto-width
  if (data.length > 0) {
    const colWidths = data[0].map((_, colIndex) => {
      return Math.max(
        15,
        ...data.map((row) => String(row[colIndex] || "").length)
      );
    });
    ws["!cols"] = colWidths.map((w) => ({ wch: w + 5 }));
  }

  // Apply styles
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellRef];
      if (!cell) continue;

      if (R === 0) {
        // Header style
        cell.s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1D9E75" } }
        };
      } else {
        // Data rows alternating style
        const bgColor = R % 2 === 1 ? rowColors.odd : rowColors.even;
        cell.s = {
          fill: { fgColor: { rgb: bgColor } }
        };
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
