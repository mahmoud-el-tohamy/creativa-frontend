export type PeriodType = "month" | "3months" | "6months" | "year" | "custom";

export interface IInstructor {
  id: string; // The frontend maps _id to id or the backend sends it directly in some cases; it's safest to define id and use it. We'll use id string.
  _id?: string;
  name: string;
  isActive: boolean;
  specializations: string[];
  graduationYear: number | null;
  cvLink: string;
  dailyTrainingRate: number;
  dailyConsultationRate: number;
  hourlyTrainingRate: number;
  hourlyConsultationRate: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  createdByName: string;
  ratePeriods?: IRatePeriod[];
}

export interface IRatePeriod {
  _id: string;
  startDate: string;
  endDate: string | null;
  dailyTrainingRate: number;
  dailyConsultationRate: number;
  isCurrent: boolean;
  note: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface CreateInstructorData {
  name: string;
  specializations?: string[];
  graduationYear?: number | null;
  cvLink?: string;
  dailyTrainingRate?: number;
  dailyConsultationRate?: number;
}

export interface UpdateInstructorData {
  name?: string;
  specializations?: string[];
  isActive?: boolean;
}

export interface UpdateRatesData {
  dailyTrainingRate?: number;
  dailyConsultationRate?: number;
  graduationYear?: number | null;
  cvLink?: string;
}

export interface InstructorSessionRow {
  _id: string;
  sessionName: string;
  programName: string;
  date: string;
  dateFrom: string;
  dateTo: string;
  hours: number;
  dayValue: number;
  attendeesCount: number;
  mode: string;
  type: string;
  unitRate: number;
  sessionAmount: number;
  isConsultation: boolean;
  isPaid: boolean;
}

export interface InstructorDashboardData {
  instructor: IInstructor;
  period: { start: string; end: string; label: string };
  totalHours: number;
  totalSessions: number;
  totalDays: number;
  avgAttendeesPerSession: number;
  avgHoursPerSession: number;
  onlineCount: number;
  offlineCount: number;
  onlinePct: number;
  offlinePct: number;
  programBreakdown: {
    program: string;
    hours: number;
    sessions: number;
    totalAmount: number;
  }[];
  typeBreakdown: {
    type: string;
    hours: number;
    sessions: number;
    totalAmount: number;
  }[];
  sessions: InstructorSessionRow[];
  periodTotalAmount: number;
  consultationAmount: number;
  trainingAmount: number;
}

export interface InstructorListParams {
  search?: string;
  specialization?: string;
  page?: number;
  limit?: number;
  includeInactive?: string | boolean;
}

export interface InstructorListResponse {
  success: boolean;
  data: IInstructor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InstructorResponse {
  success: boolean;
  data: IInstructor;
}

export interface AccountantDashboardData {
  period: { start: string; end: string; label: string };

  totalPayable: number;
  trainingPayable: number;
  consultationPayable: number;

  instructorSummaries: {
    instructorId: string;
    instructorName: string;
    totalHours: number;
    totalSessions: number;
    totalDays: number;
    totalAmount: number;
    trainingAmount: number;
    consultationAmount: number;
    hasRates: boolean;
  }[];

  programBreakdown: {
    program: string;
    totalHours: number;
    totalSessions: number;
    totalAmount: number;
  }[];

  monthlyTrend: {
    month: string;
    totalHours: number;
    totalAmount: number;
    sessionCount: number;
  }[];

  onlineCount: number;
  offlineCount: number;
  totalSessions: number;
  totalHours: number;
  avgHoursPerSession: number;

  instructorsWithoutRates: {
    id: string;
    name: string;
  }[];
}
