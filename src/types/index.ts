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
  matsuebsCode?: string; // e.g. "NB", "NJ", "XJ", "ND", "KL"
  isHighFrequencyDaily?: boolean; // 是否為一日多班高頻航線
  tripsPerDay?: number;
}

export type ShiftType = 'DAY' | 'NIGHT' | 'VOYAGE' | 'STANDBY' | 'SHIFT_A_MORNING' | 'SHIFT_B_AFTERNOON' | 'SPECIAL_VOYAGE';

export interface FerryTrip {
  id: string;
  routeId: string;
  tripCode: string; // e.g. "NB-0700", "NJ-0700", "XJ-0730", "TM-2230"
  departurePort: string;
  arrivalPort: string;
  departureTime: string; // HH:mm
  arrivalTime: string; // HH:mm
  voyageDurationHours: number; // 純航程 (小時)
  prepDurationHours: number; // 航前整備/點檢/登船工時 (小時)
  postDurationHours: number; // 靠泊/下船/清消整備工時 (小時)
  totalDutyHours: number; // 該班次實際計入工作時數
  defaultVesselId: string;
  shiftGroup: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'FULL_DAY';
  operatingFrequency: 'DAILY' | 'ODD_DAYS' | 'EVEN_DAYS' | 'WEEKDAYS_ONLY';
  fareRegularNTD: number;
  status: 'NORMAL' | 'EXTRA' | 'SUSPENDED'; // 正常班次、加開班次、天候停航
  note?: string;
}

export interface ScheduleEntry {
  id: string;
  date: string; // YYYY-MM-DD
  vesselId: string;
  routeId: string;
  role: CrewRole;
  crewId: string;
  shift: ShiftType;
  tripIds?: string[]; // 當日負責執行的特定船班航次 ID 清單
  dutyStartTime?: string; // 當日值班開始時間 e.g. "06:30"
  dutyEndTime?: string; // 當日值班結束時間 e.g. "13:30"
  breakHours?: number; // 班次間隔休息時間 (小時)
  isCover: boolean; // 是否為代班
  coverForCrewId?: string; // 代替哪位船員
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  plannedHours: number; // 排定工時
  actualHours: number; // 實際工時
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

export type ComplianceViolationType = 
  | 'OVERTIME_DAILY_12H' // 每日工時超過 12 小時 (船員法嚴格違規)
  | 'OVERTIME_DAILY_8H' // 每日正常工時超時 (需計加班費)
  | 'INSUFFICIENT_24H_REST' // 24小時內休息不足 10 小時 (STCW/船員法)
  | 'INSUFFICIENT_CONTINUOUS_REST' // 連續主休息未滿 6 小時
  | 'CONSECUTIVE_7_DAYS' // 連續出勤超過 6 天 (違反每7天須1天例假)
  | 'MONTHLY_OVERTIME_LIMIT' // 月累計加班超過 46 小時
  | 'VOYAGE_TIME_CONFLICT' // 船班時段重疊衝突
  | 'SAFETY_MANNING' // 船舶最低安全配額不足
  | 'QUALIFICATION' // 職等/證書不符
  | 'DOUBLE_BOOKING' // 同日跨船雙重排班
  | 'ON_LEAVE' // 已核准休假卻被排班
  | 'EXPIRED_CERT' // 證照過期失效
  | 'REST_VIOLATION'; // 其他休息時間違規

export interface ComplianceValidation {
  isValid: boolean;
  overallScore: number; // 0~100 合規指數
  legalStandards: {
    maxDailyHours: number; // 12h
    standardDailyHours: number; // 8h
    minDailyRestHours: number; // 10h
    minMainRestHours: number; // 6h
    maxConsecutiveDays: number; // 6d
    maxMonthlyOvertimeHours: number; // 46h
  };
  errors: {
    type: ComplianceViolationType;
    vesselId?: string;
    vesselName?: string;
    crewId?: string;
    crewName?: string;
    date?: string;
    message: string;
    detailRule?: string; // 法規法條依據 (例如「船員法第31條」、「STCW Regulation VIII/1」)
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  }[];
  warnings: {
    type: string;
    crewId?: string;
    crewName?: string;
    date?: string;
    message: string;
  }[];
  crewDailyMetrics?: Record<string, {
    totalDailyDutyHours: number;
    restHours24h: number;
    consecutiveWorkDays: number;
    isOvertime: boolean;
    isOverLimit: boolean;
    isRestCompliant: boolean;
  }>;
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

