export type Nationality = 'TW' | 'FOREIGN';

export type CrewRole = 
  | '船長' 
  | '大副' 
  | '二副' 
  | '輪機長' 
  | '大管輪' 
  | '管輪' 
  | '水手長' 
  | '舵工' 
  | '水手' 
  | '機匠長' 
  | '機匠' 
  | '事務長' 
  | '大廚';

export type CertificateRank = 
  | '一等船長' 
  | '二等船長' 
  | '三等船長' 
  | '一等大副' 
  | '二等大副' 
  | '一等船副' 
  | '二等船副' 
  | '一等輪機長' 
  | '二等輪機長' 
  | '一等大管輪' 
  | '二等大管輪' 
  | '一等管輪' 
  | '二等管輪' 
  | '助理級航行當值' 
  | '助理級輪機當值' 
  | '通用乙級船員';

export interface STCWCertificate {
  id: string;
  name: string; // e.g., 'STCW 一等船長適任證書', '救生艇筏及救難艇操縱', '高級滅火', '醫療急救'
  certNo: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
  isCompliant: boolean;
}

export interface CrewMember {
  id: string;
  code: string; // e.g. "TW-001", "FN-001"
  name: string;
  englishName?: string;
  nationality: Nationality;
  role: CrewRole;
  rankLevel: CertificateRank;
  certificates: STCWCertificate[];
  certExpiryDate: string; // Primary cert expiry date
  allowedVessels: string[]; // Vessel IDs they can work on
  forbiddenVessels?: string[]; // Specifically disallowed vessels
  fixedVesselId?: string; // Foreign crew or fixed staff fixed ship
  phone: string;
  hireDate: string;
  baseSalary: number;
  standardMonthlyRestDays: number; // e.g. 8 days
  takenMonthlyRestDays: number; // e.g. 5 days
  annualLeaveTotal: number; // Annual leave quota
  annualLeaveTaken: number;
  status: 'ACTIVE' | 'ON_LEAVE' | 'REST' | 'STANDBY';
  notes?: string;
}

export interface VesselSafetyRequirement {
  id: string;
  role: CrewRole;
  requiredRank: CertificateRank[]; // Accepted rank levels
  requiredCertTypes: string[]; // Essential certifications required
  minCount: number; // Required personnel count
  eligibleCrewIds?: string[]; // Specific whitelisted crew
  forbiddenCrewIds?: string[]; // Specific blacklisted crew
}

export interface Vessel {
  id: string;
  name: string;
  tonnage: number; // GT
  tonnageCategory: '497T' | '350T' | '99T' | 'OTHER';
  routeId: string;
  minSafetyManning: number; // Total required crew count
  safetyRequirements: VesselSafetyRequirement[];
  description: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'STANDBY';
}

export interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  standardDurationHours: number;
  baseAllowancePerVoyage: number;
  monthlyFrequency: number;
  description: string;
}

export type ShiftType = 'DAY' | 'NIGHT' | 'VOYAGE' | 'STANDBY';

export interface ScheduleEntry {
  id: string;
  date: string; // YYYY-MM-DD
  vesselId: string;
  routeId: string;
  role: CrewRole;
  crewId: string;
  shift: ShiftType;
  isCover: boolean; // 是否為代班
  coverForCrewId?: string; // 代替哪位船員
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  plannedHours: number;
  actualHours: number;
  isFixedAssignment?: boolean;
  notes?: string;
}

export type LeaveType = 'MONTHLY_REST' | 'ANNUAL' | 'COMPENSATORY' | 'SICK' | 'OFFICIAL' | 'SPECIAL';

export interface LeaveRequest {
  id: string;
  crewId: string;
  date: string; // YYYY-MM-DD
  type: LeaveType;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requestedAt: string; // ISO String with timestamp for First-come-first-served
  reason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
}

export interface ComplianceValidation {
  isValid: boolean;
  errors: {
    type: 'SAFETY_MANNING' | 'QUALIFICATION' | 'DOUBLE_BOOKING' | 'ON_LEAVE' | 'EXPIRED_CERT' | 'REST_VIOLATION';
    vesselId?: string;
    vesselName?: string;
    crewId?: string;
    crewName?: string;
    date?: string;
    message: string;
  }[];
  warnings: {
    type: string;
    message: string;
  }[];
}

export interface WorkHoursSummary {
  crewId: string;
  crewName: string;
  nationality: Nationality;
  role: CrewRole;
  month: string; // YYYY-MM
  vesselIds: string[];
  routeIds: string[];
  dutyDays: number;
  leaveDays: number;
  regularHours: number;
  overtimeHours: number;
  voyageHours: number;
  nightWatchHours: number;
  totalWorkHours: number;
  standardMonthlyTargetHours: number;
}

export type AllowanceCalcType = 'PER_DAY' | 'PER_VOYAGE' | 'MONTHLY_FIXED' | 'PER_HOUR';

export interface AllowanceRule {
  id: string;
  name: string;
  category: 'VOYAGE' | 'TONNAGE' | 'ROLE_SPECIAL' | 'WATCH_NIGHT' | 'MEAL' | 'PORT_OP' | 'COVER';
  calcType: AllowanceCalcType;
  rate: number;
  conditions: {
    applicableRoles?: CrewRole[];
    applicableTonnages?: ('497T' | '350T' | '99T' | 'OTHER')[];
    applicableRouteIds?: string[];
    isNightShift?: boolean;
    isCoverOnly?: boolean;
  };
  description: string;
  isActive: boolean;
}

export interface AllowanceItemBreakdown {
  ruleId: string;
  ruleName: string;
  category: string;
  unitRate: number;
  quantity: number;
  unit: string;
  amount: number;
  calculationBasis: string; // e.g. "海龍號(497T) 出勤 20 天 × $400/天"
}

export interface CrewAllowanceSummary {
  crewId: string;
  crewName: string;
  role: CrewRole;
  month: string;
  items: AllowanceItemBreakdown[];
  totalAllowance: number;
}

export interface SalaryDeductionItem {
  id: string;
  name: string;
  amount: number;
}

export interface PayrollRecord {
  id: string;
  crewId: string;
  crewName: string;
  nationality: Nationality;
  role: CrewRole;
  month: string; // YYYY-MM
  baseSalary: number;
  allowancesTotal: number;
  allowanceDetails: AllowanceItemBreakdown[];
  overtimePay: number;
  overtimeHours: number;
  dutyDays: number;
  leaveDays: number;
  remainingLeaveDays: number;
  specialBonus: number;
  deductions: SalaryDeductionItem[];
  totalDeductions: number;
  grossSalary: number; // 應發薪資 (基本+津貼+加班+獎金)
  netSalary: number;   // 實發薪資 (應發 - 扣項)
  calculatedAt: string;
  status: 'DRAFT' | 'CONFIRMED' | 'PAID';
}

export type SafetyRequirement = VesselSafetyRequirement;

export type UserRole = 'CREW' | 'DISPATCHER' | 'DISPATCH' | 'HR' | 'ACCOUNTANT' | 'ADMIN';

export interface RolePermissions {
  roleName: string;
  badgeColor: string;
  canViewOwnScheduleOnly: boolean;
  canManageSchedules: boolean;
  canApproveLeave: boolean;
  canApplyLeave: boolean;
  canViewAllCrewData: boolean;
  canManageQualifications: boolean;
  canManagePayroll: boolean;
  canExportReports: boolean;
  canManageSystemSettings: boolean;
  canManageVesselConfigs: boolean;
  canViewAuditLogs: boolean;
  description: string;
}

export const ROLE_PERMISSIONS_MAP: Record<UserRole, RolePermissions> = {
  CREW: {
    roleName: '本國船員 (Crew)',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    canViewOwnScheduleOnly: true,
    canManageSchedules: false,
    canApproveLeave: false,
    canApplyLeave: true,
    canViewAllCrewData: false,
    canManageQualifications: false,
    canManagePayroll: false,
    canExportReports: false,
    canManageSystemSettings: false,
    canManageVesselConfigs: false,
    canViewAuditLogs: false,
    description: '可查閱個人專屬排班、出勤工時統計、休假餘額，並在線上先選先得登記休假',
  },
  DISPATCHER: {
    roleName: '船務管理 / 船務調度 (Ship Management)',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    canViewOwnScheduleOnly: false,
    canManageSchedules: true,
    canApproveLeave: true,
    canApplyLeave: true,
    canViewAllCrewData: true,
    canManageQualifications: true,
    canManagePayroll: false,
    canExportReports: true,
    canManageSystemSettings: false,
    canManageVesselConfigs: false,
    canViewAuditLogs: true,
    description: '負責全船隊智慧排班調度、適任資格防呆審核、船員調派代班、休假申請審查與核准',
  },
  DISPATCH: {
    roleName: '船務管理 / 船務調度 (Ship Management)',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    canViewOwnScheduleOnly: false,
    canManageSchedules: true,
    canApproveLeave: true,
    canApplyLeave: true,
    canViewAllCrewData: true,
    canManageQualifications: true,
    canManagePayroll: false,
    canExportReports: true,
    canManageSystemSettings: false,
    canManageVesselConfigs: false,
    canViewAuditLogs: true,
    description: '負責全船隊智慧排班調度、適任資格防呆審核、船員調派代班、休假申請審查與核准',
  },
  HR: {
    roleName: '人事與會計薪資 (HR / Payroll)',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    canViewOwnScheduleOnly: false,
    canManageSchedules: false,
    canApproveLeave: false,
    canApplyLeave: false,
    canViewAllCrewData: true,
    canManageQualifications: true,
    canManagePayroll: true,
    canExportReports: true,
    canManageSystemSettings: false,
    canManageVesselConfigs: false,
    canViewAuditLogs: true,
    description: '負責全體船員資料履歷、各項津貼自動核算、工時稽核、月度薪資單產出與財務匯出',
  },
  ACCOUNTANT: {
    roleName: '人事與會計薪資 (HR / Payroll)',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    canViewOwnScheduleOnly: false,
    canManageSchedules: false,
    canApproveLeave: false,
    canApplyLeave: false,
    canViewAllCrewData: true,
    canManageQualifications: true,
    canManagePayroll: true,
    canExportReports: true,
    canManageSystemSettings: false,
    canManageVesselConfigs: false,
    canViewAuditLogs: true,
    description: '負責全體船員資料履歷、各項津貼自動核算、工時稽核、月度薪資單產出與財務匯出',
  },
  ADMIN: {
    roleName: '系統最高管理者 (Administrator)',
    badgeColor: 'bg-slate-900 text-white border-slate-700',
    canViewOwnScheduleOnly: false,
    canManageSchedules: true,
    canApproveLeave: true,
    canApplyLeave: true,
    canViewAllCrewData: true,
    canManageQualifications: true,
    canManagePayroll: true,
    canExportReports: true,
    canManageSystemSettings: true,
    canManageVesselConfigs: true,
    canViewAuditLogs: true,
    description: '擁有系統全功能權限，包含法定安全配置表維護、適任證書規則、各項津貼費率及系統審計日誌',
  },
};


export interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  crewId?: string; // Linked crew member if role === 'CREW'
  department: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  operatorName?: string;
  operatorRole?: UserRole;
  performedByName?: string;
  performedByRole?: UserRole;
  actionType?: string;
  action?: string;
  targetType: 'CREW' | 'VESSEL' | 'SCHEDULE' | 'LEAVE' | 'RULE' | 'PAYROLL' | 'ALLOWANCE_RULE';
  targetId: string;
  targetName: string;
  details: string;
}

