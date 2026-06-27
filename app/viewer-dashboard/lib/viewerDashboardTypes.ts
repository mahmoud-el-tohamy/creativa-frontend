import { BlacklistEntry } from "@/lib/api";

export interface DashboardStatsResponse {
  success: boolean;
  data: {
    label: string;
    fullLabel?: string;
    additions: number;
    cumulative: number;
    key: string;
    rawDate: string;
  }[];
  blacklist?: BlacklistEntry[];
  users?: { total: number };
}

export interface TrainingStatsResponse {
  fiscalYear: string;
  totalTrainingDays: number;
  totalSessions: number;
  totalAttendees: number;
  totalHours: number;
  programDays: {
    program: string;
    totalDays: number;
    sessionCount: number;
    attendeesCount: number;
    totalHours: number;
  }[];
  monthlyActivity: {
    month: string;
    monthIndex: number;
    sessions: number;
    days: number;
    attendees: number;
    hours: number;
  }[];
  dailyActivity: {
    date: string;
    sessions: number;
    days: number;
    attendees: number;
  }[];
  modeBreakdown: {
    online: number;
    offline: number;
    hybrid: number;
  };
  typeBreakdown: {
    type: string;
    count: number;
    pct: number;
  }[];
  topInstructors: {
    name: string;
    sessions: number;
    totalHours: number;
    totalAttendees: number;
  }[];
}
