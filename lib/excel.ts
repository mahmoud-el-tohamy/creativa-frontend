import XLSX from "xlsx-js-style";
import { validateNationalId } from "./validation";

export interface Person {
  name: string;
  nationalId: string;
  phone?: string;
  email?: string;
  rowNumber?: number;
}

export interface MultiDayAttendancePerson {
  name: string;
  id: string;
  nationalId: string;
  invalidReason?: string;
  rowNumber?: number;
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

function toEnglishDigits(str: string) {
  const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return str.replace(/[٠-٩]/g, (w) => arabicNumbers.indexOf(w).toString());
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
      .map((row, index) => ({
        name: String(row[0] || "").trim(),
        nationalId: toEnglishDigits(String(row[1] || "")).replace(/\s+/g, ""),
        phone: row[2] ? String(row[2]) : undefined,
        email: row[3] ? String(row[3]) : undefined,
        rowNumber: index + 2,
      }))
      .filter((p) => p.name || p.nationalId);

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
      .map((row, index) => {
        const nid = toEnglishDigits(String(row[nationalIdKey] ?? "")).replace(/\s+/g, "");
        const validation = validateNationalId(nid);
        
        return {
          name: String(row[nameKey] ?? "").trim(),
          id: String(row[idKey] ?? "").trim(),
          nationalId: nid,
          invalidReason: validation.isValid ? undefined : validation.reason,
          rowNumber: index + 2,
        };
      })
      .filter((person) => person.name || person.nationalId);

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

// ADDED: Sheet Organizer section
export async function readExcelRaw(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  if (!sheet) {
    throw new Error("لم يتم العثور على أي Sheet داخل الملف.");
  }

  // Get raw JSON (array of arrays to get exact headers)
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
  if (aoa.length === 0) {
    return { headers: [], rows: [] };
  }

  // First row is headers
  const headers = (aoa[0] as string[]).map((h) => String(h).trim());
  
  // Map rest to objects
  const rows = aoa.slice(1).map((rowArr) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = rowArr[i];
    });
    return obj;
  });

  return { headers, rows };
}

export function organizeAndDownload(
  rows: Record<string, unknown>[],
  headers: string[],
  filename: string
) {
  const workshopHeader = headers.find((h) => normalizeHeader(h) === "workshop name") || "Workshop Name";
  const timestampHeader = headers.find((h) => normalizeHeader(h) === "timestamp") || "Timestamp";

  const groups = new Map<string, Record<string, unknown>[]>();
  
  rows.forEach((row) => {
    const rawVal = row[workshopHeader];
    const workshopName = typeof rawVal === "string" && rawVal.trim() !== "" ? rawVal.trim() : "غير محدد";
    
    const rawTimestamp = row[timestampHeader];
    let datePart = "";
    if (rawTimestamp instanceof Date) {
      const dd = String(rawTimestamp.getDate()).padStart(2, '0');
      const mm = String(rawTimestamp.getMonth() + 1).padStart(2, '0');
      const yyyy = rawTimestamp.getFullYear();
      datePart = `${mm}/${dd}/${yyyy}`;
    } else if (typeof rawTimestamp === "string") {
      datePart = rawTimestamp.split(" ")[0];
    } else if (rawTimestamp) {
      datePart = String(rawTimestamp).split(" ")[0];
    }

    const groupKey = datePart ? `${workshopName} - ${datePart}` : workshopName;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(row);
  });

  const getSortTime = (key: string) => {
    if (key === "غير محدد") return Infinity;
    const row = groups.get(key)?.[0];
    if (!row) return 0;
    const rawVal = row[timestampHeader];
    if (rawVal instanceof Date) {
      return new Date(rawVal.getFullYear(), rawVal.getMonth(), rawVal.getDate()).getTime();
    }
    if (rawVal) {
      const d = new Date(String(rawVal).split(" ")[0]);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    return 0;
  };

  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === "غير محدد") return 1;
    if (b === "غير محدد") return -1;
    
    const timeA = getSortTime(a);
    const timeB = getSortTime(b);
    
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    
    return a.localeCompare(b);
  });

  const finalData: (string | number | Date)[][] = [];
  const merges: XLSX.Range[] = [];
  
  // Track specific row indices for styling
  const titleRowIndices = new Set<number>();
  const separatorRowIndices = new Set<number>();
  const dataRowIndices: { r: number; isEven: boolean }[] = [];

  // 1. Header row
  finalData.push(headers);
  let currentRowIndex = 1; // 0-indexed in SheetJS logic, so finalData[0] is row 0.

  sortedKeys.forEach((key, index) => {
    const groupRows = groups.get(key)!;

    // Data rows
    groupRows.forEach((rowObj, dataIndex) => {
      const rowArr: (string | number | Date)[] = headers.map((h) => (rowObj[h] as string | number | Date) ?? "");
      finalData.push(rowArr);
      dataRowIndices.push({ r: currentRowIndex, isEven: dataIndex % 2 === 0 });
      currentRowIndex++;
    });

    // Separator Row (if not last)
    if (index < sortedKeys.length - 1) {
      const separatorRow: (string | number | Date)[] = new Array(headers.length).fill("");
      finalData.push(separatorRow);
      separatorRowIndices.add(currentRowIndex);
      currentRowIndex++;
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(finalData);

  ws["!merges"] = merges;
  ws["!dir"] = "ltr";

  const colWidths = headers.map((header, colIndex) => {
    const norm = normalizeHeader(header);
    let minW = 12;
    if (norm.includes("name") && norm.includes("english")) minW = 25;
    else if (norm.includes("email")) minW = 28;
    else if (norm.includes("national id")) minW = 18;
    else if (norm.includes("mobile")) minW = 14;

    const maxLen = Math.max(
      minW,
      ...finalData.map((rowArr) => {
        const val = rowArr[colIndex];
        if (val instanceof Date) return 16; // Reasonable width for formatted dates
        return String(val || "").length;
      })
    );
    return { wch: maxLen + 4 };
  });
  ws["!cols"] = colWidths;

  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };

  // Apply Styles
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
  for (let R = range.s.r; R <= range.e.r; ++R) {
    // Determine row style
    let font: Record<string, unknown> = { name: "Arial", sz: 11, color: { rgb: "000000" } };
    let fill: Record<string, unknown> = { fgColor: { rgb: "FFFFFF" } };
    let alignment: Record<string, unknown> = { vertical: "center", horizontal: "center" };

    if (R === 0) {
      // Header
      font = { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } };
      fill = { fgColor: { rgb: "1D9E75" } };
    } else if (titleRowIndices.has(R)) {
      // Workshop Title
      font = { name: "Arial", sz: 12, bold: true, color: { rgb: "FFFFFF" } };
      fill = { fgColor: { rgb: "0F6E56" } };
      alignment = { vertical: "center", horizontal: "left" };
    } else if (!separatorRowIndices.has(R)) {
      // Data row
      const dataRowInfo = dataRowIndices.find((dr) => dr.r === R);
      if (dataRowInfo) {
        fill = { fgColor: { rgb: dataRowInfo.isEven ? "F0FFF8" : "FFFFFF" } };
      }
    }

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) {
        ws[cellRef] = { t: "s", v: "" };
      }
      
      const headerName = String(headers[C] || "").toLowerCase().trim();

      // Special handling for separator row
      if (separatorRowIndices.has(R)) {
        ws[cellRef].s = {
          fill: { patternType: "solid", fgColor: { rgb: "000000" } },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        };
        continue;
      }

      // Prevent large numbers (like National IDs or phone numbers) from
      // turning into scientific notation (e.g. 3.03E+13).
      if (ws[cellRef].t === "n" && !ws[cellRef].z) {
        ws[cellRef].z = "0"; // Format as plain number without decimals
      } else if (ws[cellRef].t === "n" && ws[cellRef].z === "m/d/yy") {
        if (headerName === "timestamp") {
          ws[cellRef].z = "m/d/yyyy h:mm"; // Explicitly show time for Timestamp
        } else {
          ws[cellRef].z = "m/d/yyyy"; // Only show date for other date columns
        }
      }

      ws[cellRef].s = {
        font,
        fill: { ...fill, patternType: "solid" },
        alignment,
        border: {
          top: { style: "thin", color: { rgb: "E5E7EB" } },
          bottom: { style: "thin", color: { rgb: "E5E7EB" } },
          left: { style: "thin", color: { rgb: "E5E7EB" } },
          right: { style: "thin", color: { rgb: "E5E7EB" } },
        },
      };
    }
  }

  // Set separator row height to 8px (approx 6pt)
  ws["!rows"] = [];
  for (let R = 0; R <= range.e.r; ++R) {
    if (R === 0) {
      ws["!rows"][R] = { hpx: 30 };
    } else if (titleRowIndices.has(R)) {
      ws["!rows"][R] = { hpx: 25 };
    } else if (separatorRowIndices.has(R)) {
      ws["!rows"][R] = { hpx: 8 };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الحضور المنظم");
  XLSX.writeFile(wb, `${filename.replace(/\.[^/.]+$/, "")}_منظم.xlsx`);
}
