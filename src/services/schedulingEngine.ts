import { 
  CrewMember, 
  Vessel, 
  ScheduleEntry, 
  LeaveRequest, 
  ComplianceValidation, 
  CrewRole, 
  CertificateRank,
  ShiftType
} from '../types';

export interface QualificationCheckResult {
  isEligible: boolean;
  reasons: string[];
  warnings: string[];
  criteriaBreakdown: {
    rankMatch: { passed: boolean; message: string };
    certExpiry: { passed: boolean; expiryDate: string; daysRemaining: number; isExpiringSoon: boolean; message: string };
    vesselAllowed: { passed: boolean; message: string };
    forbiddenVessel: { passed: boolean; message: string };
    foreignFixedVessel: { passed: boolean; message: string };
    blacklistedInReq: { passed: boolean; message: string };
  };
}

/**
 * 檢查船員是否符合特定船舶與職務之適任資格 (多維度交叉驗證引擎)
 */
export function checkCrewQualification(
  crew: CrewMember,
  vessel: Vessel,
  role: CrewRole,
  date?: string
): QualificationCheckResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const checkDate = date || new Date().toISOString().split('T')[0];

  // 1. 檢查特定船舶黑名單
  const isForbiddenVessel = Boolean(crew.forbiddenVessels && crew.forbiddenVessels.includes(vessel.id));
  const forbiddenVesselMsg = isForbiddenVessel 
    ? `船員已被設定不可於【${vessel.name}】任職 (船舶黑名單管制)`
    : '符合船舶限制規範';
  if (isForbiddenVessel) {
    reasons.push(forbiddenVesselMsg);
  }

  // 2. 檢查適任船舶白名單 (若有指定)
  const isAllowedVessel = !(crew.allowedVessels && crew.allowedVessels.length > 0 && !crew.allowedVessels.includes(vessel.id));
  const allowedVesselMsg = isAllowedVessel
    ? '符合船員適任可任職船舶名冊'
    : `船員之可任職船舶名冊未包含【${vessel.name}】`;
  if (!isAllowedVessel) {
    reasons.push(allowedVesselMsg);
  }

  // 3. 檢查船舶安全配置表中對該職務的要求與職等
  const safetyReq = vessel.safetyRequirements.find(r => r.role === role);
  let isRankPassed = true;
  let rankMatchMsg = '職等資格完全符合';
  let isBlacklistedInReq = false;
  let blacklistReqMsg = '無特定職位任職限制';

  if (!safetyReq) {
    warnings.push(`該船舶安全配置未列出【${role}】編制`);
    rankMatchMsg = `該船舶未列出【${role}】編制`;
  } else {
    // 檢查職級等級相符性
    const isRankAccepted = safetyReq.requiredRank.includes(crew.rankLevel) || isRankHigherOrEqual(crew.rankLevel, safetyReq.requiredRank);
    if (!isRankAccepted) {
      isRankPassed = false;
      rankMatchMsg = `現有職等【${crew.rankLevel}】不符合該船【${role}】法定等級 (${safetyReq.requiredRank.join('、')})`;
      reasons.push(rankMatchMsg);
    }

    // 檢查是否有特定禁止人員
    if (safetyReq.forbiddenCrewIds?.includes(crew.id)) {
      isBlacklistedInReq = true;
      blacklistReqMsg = `此船員在該船舶之【${role}】限制名單中`;
      reasons.push(blacklistReqMsg);
    }
  }

  // 4. 檢查適任證書有效期限
  let isCertValid = true;
  const daysUntilExpiry = Math.floor((new Date(crew.certExpiryDate).getTime() - new Date(checkDate).getTime()) / (1000 * 3600 * 24));
  const isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 90;
  let certExpiryMsg = `證書效期至 ${crew.certExpiryDate} (效期正常)`;

  if (crew.certExpiryDate < checkDate) {
    isCertValid = false;
    certExpiryMsg = `主要適任證書已於 ${crew.certExpiryDate} 逾期失效 (過期 ${Math.abs(daysUntilExpiry)} 天)`;
    reasons.push(certExpiryMsg);
  } else if (isExpiringSoon) {
    certExpiryMsg = `適任證書即將於 ${crew.certExpiryDate} 屆期 (剩餘 ${daysUntilExpiry} 天，需儘速辦理換證)`;
    warnings.push(certExpiryMsg);
  }

  // 5. 外籍船員固定船舶提示與檢查
  let isForeignFixedOk = true;
  let foreignFixedMsg = '本國籍船員或符合固定配置規範';
  if (crew.nationality === 'FOREIGN' && crew.fixedVesselId) {
    if (crew.fixedVesselId !== vessel.id) {
      isForeignFixedOk = false;
      foreignFixedMsg = `外籍固定配置人員 (固定配置: ${crew.fixedVesselId}，非本船 ${vessel.name})`;
      warnings.push(`此為外籍固定配置人員 (原配置: ${crew.fixedVesselId})，屬於跨船調派`);
    } else {
      foreignFixedMsg = `外籍人員已正確配置於約定船舶【${vessel.name}】`;
    }
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
    warnings,
    criteriaBreakdown: {
      rankMatch: { passed: isRankPassed, message: rankMatchMsg },
      certExpiry: { passed: isCertValid, expiryDate: crew.certExpiryDate, daysRemaining: daysUntilExpiry, isExpiringSoon, message: certExpiryMsg },
      vesselAllowed: { passed: isAllowedVessel, message: allowedVesselMsg },
      forbiddenVessel: { passed: !isForbiddenVessel, message: forbiddenVesselMsg },
      foreignFixedVessel: { passed: isForeignFixedOk, message: foreignFixedMsg },
      blacklistedInReq: { passed: !isBlacklistedInReq, message: blacklistReqMsg },
    },
  };
}

/**
 * 輔助判斷：較高職等可相容擔任較低職等職務
 */
function isRankHigherOrEqual(crewRank: CertificateRank, acceptedRanks: CertificateRank[]): boolean {
  const rankPriority: Record<CertificateRank, number> = {
    '一等船長': 100,
    '二等船長': 90,
    '三等船長': 80,
    '一等大副': 70,
    '二等大副': 60,
    '一等船副': 50,
    '二等船副': 40,
    '一等輪機長': 100,
    '二等輪機長': 90,
    '一等大管輪': 70,
    '二等大管輪': 60,
    '一等管輪': 50,
    '二等管輪': 40,
    '助理級航行當值': 20,
    '助理級輪機當值': 20,
    '通用乙級船員': 10,
  };

  const currentScore = rankPriority[crewRank] || 0;
  return acceptedRanks.some(r => currentScore >= (rankPriority[r] || 0));
}

/**
 * 完整檢核排班合規性 (自動排班與人工異動後即時執行)
 */
export function validateSchedules(
  schedules: ScheduleEntry[],
  vessels: Vessel[],
  crewList: CrewMember[],
  leaveRequests: LeaveRequest[],
  targetDate?: string // 若指定則僅檢查該日，否則全月檢核
): ComplianceValidation {
  const errors: ComplianceValidation['errors'] = [];
  const warnings: ComplianceValidation['warnings'] = [];

  const crewMap = new Map(crewList.map(c => [c.id, c]));
  const vesselMap = new Map(vessels.map(v => [v.id, v]));

  // 1. 篩選相關排班
  const targetSchedules = targetDate 
    ? schedules.filter(s => s.date === targetDate && s.status !== 'CANCELLED')
    : schedules.filter(s => s.status !== 'CANCELLED');

  // 按 日期 -> 船員 ID 分組，檢查「同一時間被排到兩艘船」
  const dateCrewMap = new Map<string, ScheduleEntry[]>();
  for (const s of targetSchedules) {
    const key = `${s.date}_${s.crewId}`;
    if (!dateCrewMap.has(key)) {
      dateCrewMap.set(key, []);
    }
    dateCrewMap.get(key)!.push(s);
  }

  for (const [key, entries] of dateCrewMap.entries()) {
    if (entries.length > 1) {
      const [date, crewId] = key.split('_');
      const crew = crewMap.get(crewId);
      const shipNames = entries.map(e => vesselMap.get(e.vesselId)?.name || e.vesselId).join(' 與 ');
      errors.push({
        type: 'DOUBLE_BOOKING',
        crewId,
        crewName: crew?.name || crewId,
        date,
        message: `船員【${crew?.name || crewId}】在 ${date} 同時被排定於多艘船舶執勤 (${shipNames})`,
      });
    }
  }

  // 2. 檢查「休假中被排班」
  const approvedLeaves = leaveRequests.filter(l => l.status === 'APPROVED');
  for (const s of targetSchedules) {
    const onLeave = approvedLeaves.find(l => l.crewId === s.crewId && l.date === s.date);
    if (onLeave) {
      const crew = crewMap.get(s.crewId);
      const vessel = vesselMap.get(s.vesselId);
      errors.push({
        type: 'ON_LEAVE',
        crewId: s.crewId,
        crewName: crew?.name || s.crewId,
        vesselId: s.vesselId,
        vesselName: vessel?.name || s.vesselId,
        date: s.date,
        message: `船員【${crew?.name || s.crewId}】在 ${s.date} 已核准休假，卻被排定於【${vessel?.name}】執勤`,
      });
    }
  }

  // 3. 檢查「適任資格與證書效期」
  for (const s of targetSchedules) {
    const crew = crewMap.get(s.crewId);
    const vessel = vesselMap.get(s.vesselId);
    if (!crew || !vessel) continue;

    const qual = checkCrewQualification(crew, vessel, s.role, s.date);
    if (!qual.isEligible) {
      errors.push({
        type: 'QUALIFICATION',
        crewId: crew.id,
        crewName: crew.name,
        vesselId: vessel.id,
        vesselName: vessel.name,
        date: s.date,
        message: `【${crew.name}】於【${vessel.name}】擔任【${s.role}】不符適任資格：${qual.reasons.join('；')}`,
      });
    }
    for (const w of qual.warnings) {
      warnings.push({
        type: 'QUALIFICATION_WARNING',
        message: `${s.date}【${vessel.name}】${crew.name}：${w}`,
      });
    }
  }

  // 4. 按 日期 -> 船舶 檢核「船舶安全配置表」
  const dateVesselMap = new Map<string, ScheduleEntry[]>();
  for (const s of targetSchedules) {
    const key = `${s.date}_${s.vesselId}`;
    if (!dateVesselMap.has(key)) {
      dateVesselMap.set(key, []);
    }
    dateVesselMap.get(key)!.push(s);
  }

  // 取得檢核涵蓋的日期清單
  const datesToCheck = targetDate 
    ? [targetDate] 
    : Array.from(new Set(targetSchedules.map(s => s.date))).sort();

  for (const date of datesToCheck) {
    for (const vessel of vessels) {
      if (vessel.status !== 'OPERATIONAL') continue;
      const key = `${date}_${vessel.id}`;
      const vesselSchedules = dateVesselMap.get(key) || [];

      // 檢查總人數
      if (vesselSchedules.length < vessel.minSafetyManning) {
        errors.push({
          type: 'SAFETY_MANNING',
          vesselId: vessel.id,
          vesselName: vessel.name,
          date,
          message: `${date}【${vessel.name}】配置人數不足！目前 ${vesselSchedules.length} 人，法定安全最低要求 ${vessel.minSafetyManning} 人`,
        });
      }

      // 檢查各職務需求人數
      for (const req of vessel.safetyRequirements) {
        const matchingCount = vesselSchedules.filter(s => s.role === req.role).length;
        if (matchingCount < req.minCount) {
          errors.push({
            type: 'SAFETY_MANNING',
            vesselId: vessel.id,
            vesselName: vessel.name,
            date,
            message: `${date}【${vessel.name}】缺少【${req.role}】！目前 ${matchingCount} 人，最低要求 ${req.minCount} 人`,
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 智慧自動排班引擎 (Auto-Scheduling Engine)
 * 依照：船舶安全配置 ＋ 船員適任證書 ＋ 職務/等級 ＋ 可任職船舶 ＋ 出勤/休假
 */
export function generateAutoSchedule(
  yearMonth: string, // YYYY-MM
  vessels: Vessel[],
  crewList: CrewMember[],
  leaveRequests: LeaveRequest[],
  options?: { preserveExistingConfirmed?: boolean }
): { schedules: ScheduleEntry[]; validation: ComplianceValidation } {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const schedules: ScheduleEntry[] = [];

  const approvedLeaves = leaveRequests.filter(l => l.status === 'APPROVED');
  const operationalVessels = vessels.filter(v => v.status === 'OPERATIONAL');

  // 計算每位船員本月已排班天數 (用於負載均衡)
  const shiftCountMap = new Map<string, number>();
  crewList.forEach(c => shiftCountMap.set(c.id, 0));

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const currentDate = `${yearMonth}-${dayStr}`;

    // 當天已被指派的船員集合 (防同日雙重排班)
    const assignedCrewToday = new Set<string>();

    // 1. 先指派外籍固定配置船員 (Foreign Fixed Crew)
    for (const vessel of operationalVessels) {
      const fixedForeignCrew = crewList.filter(
        c => c.nationality === 'FOREIGN' && 
             c.fixedVesselId === vessel.id && 
             c.status === 'ACTIVE'
      );

      for (const fCrew of fixedForeignCrew) {
        // 檢查當天是否請假
        const isOnLeave = approvedLeaves.some(l => l.crewId === fCrew.id && l.date === currentDate);
        if (isOnLeave) continue;

        // 檢查資格
        const qual = checkCrewQualification(fCrew, vessel, fCrew.role, currentDate);
        if (!qual.isEligible) continue;

        schedules.push({
          id: `SCH-${vessel.id}-${currentDate}-${fCrew.id}`,
          date: currentDate,
          vesselId: vessel.id,
          routeId: vessel.routeId,
          role: fCrew.role,
          crewId: fCrew.id,
          shift: 'VOYAGE',
          isCover: false,
          status: 'SCHEDULED',
          plannedHours: 8,
          actualHours: 8,
          isFixedAssignment: true,
          notes: '外籍固定船舶排定',
        });

        assignedCrewToday.add(fCrew.id);
        shiftCountMap.set(fCrew.id, (shiftCountMap.get(fCrew.id) || 0) + 1);
      }
    }

    // 2. 針對各船舶的安全配置缺額，智慧指派本國籍船員 (以及可用外籍機動船員)
    for (const vessel of operationalVessels) {
      for (const req of vessel.safetyRequirements) {
        // 目前此船此職務已被固定外籍填補的人數
        const alreadyAssignedCount = schedules.filter(
          s => s.date === currentDate && s.vesselId === vessel.id && s.role === req.role
        ).length;

        const neededCount = req.minCount - alreadyAssignedCount;
        if (neededCount <= 0) continue;

        for (let i = 0; i < neededCount; i++) {
          // 找出所有符合資格的候選船員
          const qualifiedCandidates = crewList.filter(crew => {
            // 必須不在當天已排班名單中
            if (assignedCrewToday.has(crew.id)) return false;
            // 必須不在當天已准假名單中
            if (approvedLeaves.some(l => l.crewId === crew.id && l.date === currentDate)) return false;
            // 狀態必須為 ACTIVE
            if (crew.status !== 'ACTIVE') return false;

            // 檢查適任資格
            const qual = checkCrewQualification(crew, vessel, req.role, currentDate);
            return qual.isEligible;
          });

          // 排序候選人：優先選擇本國籍、且當月排班天數較少者 (工時負載均衡)
          qualifiedCandidates.sort((a, b) => {
            const countA = shiftCountMap.get(a.id) || 0;
            const countB = shiftCountMap.get(b.id) || 0;
            // 同職等優先
            const isExactRankA = a.role === req.role ? 0 : 1;
            const isExactRankB = b.role === req.role ? 0 : 1;
            if (isExactRankA !== isExactRankB) return isExactRankA - isExactRankB;
            return countA - countB;
          });

          if (qualifiedCandidates.length > 0) {
            const selectedCrew = qualifiedCandidates[0];
            schedules.push({
              id: `SCH-${vessel.id}-${currentDate}-${selectedCrew.id}`,
              date: currentDate,
              vesselId: vessel.id,
              routeId: vessel.routeId,
              role: req.role,
              crewId: selectedCrew.id,
              shift: 'VOYAGE',
              isCover: false,
              status: 'SCHEDULED',
              plannedHours: 8,
              actualHours: 8,
              notes: '自動排班推薦',
            });

            assignedCrewToday.add(selectedCrew.id);
            shiftCountMap.set(selectedCrew.id, (shiftCountMap.get(selectedCrew.id) || 0) + 1);
          }
        }
      }
    }
  }

  // 產出全月檢核驗證報表
  const validation = validateSchedules(schedules, vessels, crewList, leaveRequests);

  return {
    schedules,
    validation,
  };
}

/**
 * 船員休假分析引擎 (Smart Available Leave Date Analyzer)
 * 根據船舶安全配置、職務需求及其他船員休假狀況，自動分析船員「當月哪些日期可以安排休假」
 */
export function analyzeAvailableLeaveDates(
  crewMember: CrewMember,
  yearMonth: string, // YYYY-MM
  allSchedules: ScheduleEntry[],
  vessels: Vessel[],
  allCrew: CrewMember[],
  allLeaves: LeaveRequest[]
): {
  date: string;
  dayOfWeek: string;
  isAvailable: boolean;
  reason: string;
  remainingSlots: number;
  existingApplicantsCount: number;
}[] {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

  const results = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const currentDate = `${yearMonth}-${dayStr}`;
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dayNames[dateObj.getDay()];

    // 檢查該船員當日是否已經提出或核准休假
    const existingSelfLeave = allLeaves.find(
      l => l.crewId === crewMember.id && l.date === currentDate && l.status !== 'REJECTED' && l.status !== 'CANCELLED'
    );

    if (existingSelfLeave) {
      results.push({
        date: currentDate,
        dayOfWeek,
        isAvailable: false,
        reason: existingSelfLeave.status === 'APPROVED' ? '已核准休假' : '已送出休假申請 (審核中)',
        remainingSlots: 0,
        existingApplicantsCount: 1,
      });
      continue;
    }

    // 查詢該船員當天所任職之船舶 (若無排班則通常可排休)
    const currentSchedule = allSchedules.find(
      s => s.crewId === crewMember.id && s.date === currentDate && s.status !== 'CANCELLED'
    );

    // 找出同職務或可代理之合格船員總數
    const peerQualifiedCrew = allCrew.filter(c => {
      if (c.id === crewMember.id) return false;
      if (c.status !== 'ACTIVE') return false;
      return c.role === crewMember.role || isRankHigherOrEqual(c.rankLevel, [crewMember.rankLevel]);
    });

    // 當日已有多少位同組同職務船員請假
    const peerLeavesToday = allLeaves.filter(
      l => l.date === currentDate && 
           l.status !== 'REJECTED' && 
           l.status !== 'CANCELLED' &&
           peerQualifiedCrew.some(p => p.id === l.crewId)
    );

    // 計算最大可休假名額上限 (例如船長總共4名，最少需維持2-3名在航，因此當天上限通常為1-2人)
    const totalQualifiedForRole = peerQualifiedCrew.length + 1;
    const maxLeaveSlotsForRole = Math.max(1, Math.floor(totalQualifiedForRole * 0.35)); // 容許最多35%人員同日輪休
    const takenSlots = peerLeavesToday.length;
    const remainingSlots = Math.max(0, maxLeaveSlotsForRole - takenSlots);

    if (remainingSlots <= 0) {
      results.push({
        date: currentDate,
        dayOfWeek,
        isAvailable: false,
        reason: `當日同職務(${crewMember.role})休假名額已滿 (${takenSlots}/${maxLeaveSlotsForRole})`,
        remainingSlots: 0,
        existingApplicantsCount: takenSlots,
      });
    } else {
      results.push({
        date: currentDate,
        dayOfWeek,
        isAvailable: true,
        reason: currentSchedule 
          ? `可安排休假 (需由備勤合格代理人調度，剩餘 ${remainingSlots} 名額)` 
          : `非核心排班日，可自由預選 (剩餘 ${remainingSlots} 名額)`,
        remainingSlots,
        existingApplicantsCount: takenSlots,
      });
    }
  }

  return results;
}

/**
 * 全船隊適任資格交叉驗證稽核引擎 (Fleet-Wide Qualification Audit)
 * 遍歷所有 6 艘船舶之安全配置表與 46 位船員，產出全船隊適任性與合格名單稽核報告
 */
export interface FleetQualificationAuditReport {
  timestamp: string;
  totalVessels: number;
  totalCrew: number;
  totalRequirements: number;
  fullyCoveredRequirements: number;
  atRiskRequirements: number;
  expiredCertsCount: number;
  expiringSoonCertsCount: number;
  vesselReports: {
    vessel: Vessel;
    requirementsAudit: {
      requirement: import('../types').VesselSafetyRequirement;
      eligibleCrew: CrewMember[];
      ineligibleCrewWithReasons: { crew: CrewMember; reasons: string[]; warnings: string[] }[];
      isCovered: boolean;
      coverageRatio: number;
    }[];
  }[];
  criticalAlerts: string[];
}

export function auditFleetQualifications(
  crewList: CrewMember[],
  vessels: Vessel[],
  targetDate?: string
): FleetQualificationAuditReport {
  const checkDate = targetDate || new Date().toISOString().split('T')[0];
  const criticalAlerts: string[] = [];
  let totalRequirements = 0;
  let fullyCoveredRequirements = 0;
  let atRiskRequirements = 0;

  // 計算過期與即將過期證照
  let expiredCertsCount = 0;
  let expiringSoonCertsCount = 0;

  crewList.forEach(c => {
    const days = Math.floor((new Date(c.certExpiryDate).getTime() - new Date(checkDate).getTime()) / (1000 * 3600 * 24));
    if (days < 0) expiredCertsCount++;
    else if (days <= 90) expiringSoonCertsCount++;
  });

  const vesselReports = vessels.map(vessel => {
    const requirementsAudit = vessel.safetyRequirements.map(req => {
      totalRequirements++;
      const eligibleCrew: CrewMember[] = [];
      const ineligibleCrewWithReasons: { crew: CrewMember; reasons: string[]; warnings: string[] }[] = [];

      crewList.forEach(crew => {
        const qual = checkCrewQualification(crew, vessel, req.role, checkDate);
        if (qual.isEligible) {
          eligibleCrew.push(crew);
        } else {
          // 只收錄同領域相關或具備基本適任潛力的船員以提供精準原因
          if (crew.role === req.role || crew.rankLevel.includes(req.role) || isRankHigherOrEqual(crew.rankLevel, req.requiredRank)) {
            ineligibleCrewWithReasons.push({
              crew,
              reasons: qual.reasons,
              warnings: qual.warnings,
            });
          }
        }
      });

      const isCovered = eligibleCrew.length >= req.minCount;
      if (isCovered) fullyCoveredRequirements++;
      else {
        atRiskRequirements++;
        criticalAlerts.push(`【${vessel.name}】之【${req.role}】儲備人數不足 (法定最低 ${req.minCount} 人，目前合格 ${eligibleCrew.length} 人)`);
      }

      return {
        requirement: req,
        eligibleCrew,
        ineligibleCrewWithReasons,
        isCovered,
        coverageRatio: req.minCount > 0 ? (eligibleCrew.length / req.minCount) : 1,
      };
    });

    return {
      vessel,
      requirementsAudit,
    };
  });

  return {
    timestamp: new Date().toISOString(),
    totalVessels: vessels.length,
    totalCrew: crewList.length,
    totalRequirements,
    fullyCoveredRequirements,
    atRiskRequirements,
    expiredCertsCount,
    expiringSoonCertsCount,
    vesselReports,
    criticalAlerts,
  };
}
