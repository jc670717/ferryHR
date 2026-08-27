import { 
  CrewMember, 
  Vessel, 
  Route, 
  ScheduleEntry, 
  LeaveRequest, 
  AllowanceRule, 
  WorkHoursSummary, 
  AllowanceItemBreakdown, 
  CrewAllowanceSummary, 
  PayrollRecord 
} from '../types';

/**
 * 計算船員當月工時明細
 */
export function calculateCrewWorkHours(
  crew: CrewMember,
  yearMonth: string,
  schedules: ScheduleEntry[],
  leaves: LeaveRequest[]
): WorkHoursSummary {
  const crewSchedules = schedules.filter(
    s => s.crewId === crew.id && s.date.startsWith(yearMonth) && s.status !== 'CANCELLED'
  );
  const crewLeaves = leaves.filter(
    l => l.crewId === crew.id && l.date.startsWith(yearMonth) && l.status === 'APPROVED'
  );

  const dutyDays = crewSchedules.length;
  const leaveDays = crewLeaves.length;

  let regularHours = 0;
  let overtimeHours = 0;
  let voyageHours = 0;
  let nightWatchHours = 0;

  for (const s of crewSchedules) {
    const hours = s.actualHours || s.plannedHours || 8;
    voyageHours += hours;

    if (hours <= 8) {
      regularHours += hours;
    } else {
      regularHours += 8;
      overtimeHours += (hours - 8);
    }

    if (s.shift === 'NIGHT') {
      nightWatchHours += 4;
    }
  }

  // 標準每月工時以法定 174 小時為基準
  const standardMonthlyTargetHours = 174;
  const totalWorkHours = regularHours + overtimeHours;

  const vesselIds = Array.from(new Set(crewSchedules.map(s => s.vesselId)));
  const routeIds = Array.from(new Set(crewSchedules.map(s => s.routeId)));

  return {
    crewId: crew.id,
    crewName: crew.name,
    nationality: crew.nationality,
    role: crew.role,
    month: yearMonth,
    vesselIds,
    routeIds,
    dutyDays,
    leaveDays,
    regularHours,
    overtimeHours,
    voyageHours,
    nightWatchHours,
    totalWorkHours,
    standardMonthlyTargetHours,
  };
}

/**
 * 計算船員當月各項津貼明細 (具備完整追溯計算依據)
 */
export function calculateCrewAllowances(
  crew: CrewMember,
  yearMonth: string,
  schedules: ScheduleEntry[],
  routes: Route[],
  vessels: Vessel[],
  rules: AllowanceRule[]
): CrewAllowanceSummary {
  const crewSchedules = schedules.filter(
    s => s.crewId === crew.id && s.date.startsWith(yearMonth) && s.status !== 'CANCELLED'
  );

  const vesselMap = new Map(vessels.map(v => [v.id, v]));
  const routeMap = new Map(routes.map(r => [r.id, r]));
  const items: AllowanceItemBreakdown[] = [];

  for (const rule of rules) {
    if (!rule.isActive) continue;

    // 1. 航次航行津貼 (依每條航線標準核算)
    if (rule.category === 'VOYAGE') {
      let voyageTotal = 0;
      const routeCounts: Record<string, number> = {};

      for (const s of crewSchedules) {
        const vessel = vesselMap.get(s.vesselId);
        const route = routeMap.get(s.routeId || vessel?.routeId || '');
        if (route) {
          routeCounts[route.name] = (routeCounts[route.name] || 0) + 1;
          voyageTotal += route.baseAllowancePerVoyage;
        }
      }

      if (voyageTotal > 0) {
        const breakdownDesc = Object.entries(routeCounts)
          .map(([rName, count]) => `${rName} ${count}航次`)
          .join('、');

        items.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          unitRate: rule.rate,
          quantity: crewSchedules.length,
          unit: '航次',
          amount: voyageTotal,
          calculationBasis: `執勤航次：${breakdownDesc}，共計 ${crewSchedules.length} 航次核發`,
        });
      }
    }

    // 2. 船舶噸位加給 (497T / 350T)
    if (rule.category === 'TONNAGE' && rule.conditions.applicableTonnages) {
      let daysOnTonnage = 0;
      for (const s of crewSchedules) {
        const vessel = vesselMap.get(s.vesselId);
        if (vessel && rule.conditions.applicableTonnages.includes(vessel.tonnageCategory)) {
          daysOnTonnage++;
        }
      }

      if (daysOnTonnage > 0) {
        const targetTonnage = rule.conditions.applicableTonnages.join('/');
        items.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          unitRate: rule.rate,
          quantity: daysOnTonnage,
          unit: '天',
          amount: daysOnTonnage * rule.rate,
          calculationBasis: `於 ${targetTonnage} 船舶出勤共 ${daysOnTonnage} 天 × 每日 $${rule.rate}`,
        });
      }
    }

    // 3. 職務專業加給 (一等船長、輪機長、大副、大管輪等)
    if (rule.category === 'ROLE_SPECIAL' && rule.conditions.applicableRoles) {
      if (rule.conditions.applicableRoles.includes(crew.role)) {
        items.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          unitRate: rule.rate,
          quantity: 1,
          unit: '月',
          amount: rule.rate,
          calculationBasis: `符合【${crew.role}】一等專業適任資格，按月固定加發專業職務津貼 $${rule.rate.toLocaleString()}`,
        });
      }
    }

    // 4. 夜航航行當值津貼
    if (rule.category === 'WATCH_NIGHT') {
      const nightShifts = crewSchedules.filter(s => s.shift === 'NIGHT').length;
      if (nightShifts > 0) {
        items.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          unitRate: rule.rate,
          quantity: nightShifts,
          unit: '班次',
          amount: nightShifts * rule.rate,
          calculationBasis: `當月跨夜/夜間航行執勤共 ${nightShifts} 班次 × 每班 $${rule.rate}`,
        });
      }
    }

    // 5. 膳食伙食補貼
    if (rule.category === 'MEAL') {
      const dutyDays = crewSchedules.length;
      if (dutyDays > 0) {
        items.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          unitRate: rule.rate,
          quantity: dutyDays,
          unit: '天',
          amount: dutyDays * rule.rate,
          calculationBasis: `船上出勤伙食補貼：出勤 ${dutyDays} 天 × 每日 $${rule.rate}`,
        });
      }
    }

    // 6. 臨時代班支援津貼
    if (rule.category === 'COVER') {
      const coverDays = crewSchedules.filter(s => s.isCover).length;
      if (coverDays > 0) {
        items.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          unitRate: rule.rate,
          quantity: coverDays,
          unit: '天',
          amount: coverDays * rule.rate,
          calculationBasis: `休假日臨時代班/支援調派共 ${coverDays} 天 × 每日加發 $${rule.rate}`,
        });
      }
    }
  }

  const totalAllowance = items.reduce((acc, item) => acc + item.amount, 0);

  return {
    crewId: crew.id,
    crewName: crew.name,
    role: crew.role,
    month: yearMonth,
    items,
    totalAllowance,
  };
}

/**
 * 結算每位船員整月薪資 (基本薪資 + 津貼 + 加班費 - 應扣項目 = 實發薪資)
 */
export function calculateCrewMonthlyPayroll(
  crew: CrewMember,
  yearMonth: string,
  workHours: WorkHoursSummary,
  allowanceSummary: CrewAllowanceSummary
): PayrollRecord {
  const baseSalary = crew.baseSalary;
  const allowancesTotal = allowanceSummary.totalAllowance;

  // 加班費計算 (時薪 = 底薪 / 240, 加班以 1.33 / 1.66 倍計算，此處以均值 1.5 倍計算)
  const hourlyRate = Math.round(baseSalary / 240);
  const overtimePay = Math.round(workHours.overtimeHours * hourlyRate * 1.5);

  // 績效/安全航行獎金 (出勤天數達標或固定獎金)
  const specialBonus = workHours.dutyDays >= 20 ? 3000 : 0;

  // 法定代扣項目 (勞保、健保、退職金自提、所得稅等)
  const laborInsurance = Math.round(baseSalary * 0.022);
  const healthInsurance = Math.round(baseSalary * 0.015);
  const taxWithholding = Math.round((baseSalary + allowancesTotal) * 0.05);

  const deductions = [
    { id: 'D-LABOR', name: '勞工保險費 (自付額)', amount: laborInsurance },
    { id: 'D-HEALTH', name: '全民健康保險 (自付額)', amount: healthInsurance },
    { id: 'D-TAX', name: '代扣所得稅額', amount: taxWithholding },
    { id: 'D-WELFARE', name: '職工福利金', amount: 300 },
  ];

  const totalDeductions = deductions.reduce((acc, d) => acc + d.amount, 0);
  const grossSalary = baseSalary + allowancesTotal + overtimePay + specialBonus;
  const netSalary = grossSalary - totalDeductions;

  return {
    id: `PAY-${crew.id}-${yearMonth}`,
    crewId: crew.id,
    crewName: crew.name,
    nationality: crew.nationality,
    role: crew.role,
    month: yearMonth,
    baseSalary,
    allowancesTotal,
    allowanceDetails: allowanceSummary.items,
    overtimePay,
    overtimeHours: workHours.overtimeHours,
    dutyDays: workHours.dutyDays,
    leaveDays: workHours.leaveDays,
    remainingLeaveDays: crew.standardMonthlyRestDays - workHours.leaveDays,
    specialBonus,
    deductions,
    totalDeductions,
    grossSalary,
    netSalary,
    calculatedAt: new Date().toISOString(),
    status: 'CONFIRMED',
  };
}

/**
 * 匯出 CSV (支援 Excel UTF-8 BOM 避免中文亂碼)
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => {
        const cellStr = String(cell ?? '').replace(/"/g, '""');
        return `"${cellStr}"`;
      }).join(',')
    )
  ].join('\r\n');

  // Add UTF-8 BOM (\uFEFF) for Excel compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
