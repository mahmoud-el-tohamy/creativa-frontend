// ─── Planned Timetable Types ──────────────────────────────────────────────────

/**
 * Nested: program → calendarMonthIndex(string) → day(string) → value(0|0.5|1)
 * Calendar months: 0=Jan…11=Dec (May=4, Apr=3)
 */
export type PlannedData = {
  [program: string]: {
    [monthIndex: string]: {
      [day: string]: number;
    };
  };
};

export interface ProgramTotal {
  total: number;
  monthly: { [monthIndex: string]: number };
  q1: number; // May+Jun+Jul
  q2: number; // Aug+Sep+Oct
  q3: number; // Nov+Dec+Jan
  q4: number; // Feb+Mar+Apr
}

export interface PlannedTimetableResponse {
  fiscalYear: string;
  data: PlannedData;
  programTotals: { [program: string]: ProgramTotal };
  grandTotal: number;
  lastEditedBy: string;
  lastEditedByName: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CellUpdatePayload {
  program: string;
  monthIndex: number; // calendar month 0-11
  day: number | string;        // 1-31 or "consultations"
  value: number;
}

// ─── Comparison Types ─────────────────────────────────────────────────────────

export interface ComparisonCell {
  planned: number;
  actual: number;
  diff: number;
}

export interface ProgramComparison {
  program: string;
  plannedTotal: number;
  actualTotal: number;
  diffTotal: number;
  completionPct: number;
  q1Planned: number; q1Actual: number; q1Diff: number;
  q2Planned: number; q2Actual: number; q2Diff: number;
  q3Planned: number; q3Actual: number; q3Diff: number;
  q4Planned: number; q4Actual: number; q4Diff: number;
}

export interface MonthlyDiffEntry {
  monthIndex: number;
  monthName: string;
  programs: {
    [program: string]: {
      [day: number]: ComparisonCell;
      monthPlanned: number;
      monthActual: number;
      monthDiff: number;
    };
  };
}

export interface TimetableComparison {
  fiscalYear: string;
  monthlyDiff: MonthlyDiffEntry[];
  programComparisons: ProgramComparison[];
  grandPlanned: number;
  grandActual: number;
  grandDiff: number;
  overallCompletionPct: number;
}
