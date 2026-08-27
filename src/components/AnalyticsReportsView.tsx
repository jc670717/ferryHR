import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  TrendingUp, 
  DollarSign, 
  Ship, 
  Users, 
  Clock, 
  Calendar,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import { CrewMember, ScheduleEntry, LeaveRequest, Route, Vessel, AllowanceRule } from '../types';
import { 
  calculateCrewWorkHours, 
  calculateCrewAllowances, 
  calculateCrewMonthlyPayroll, 
  exportToCSV 
} from '../services/payrollEngine';

interface AnalyticsReportsViewProps {
  selectedMonth: string;
  vessels: Vessel[];
  crewList: CrewMember[];
  schedules: ScheduleEntry[];
  leaveRequests: LeaveRequest[];
  routes: Route[];
  allowanceRules: AllowanceRule[];
}

export const AnalyticsReportsView: React.FC<AnalyticsReportsViewProps> = ({
  selectedMonth,
  vessels,
  crewList,
  schedules,
  leaveRequests,
  routes,
  allowanceRules,
}) => {
  const [reportType, setReportType] = useState<'HR_SUMMARY' | 'VESSEL_COST' | 'LEAVE_STATUS'>('HR_SUMMARY');

  // 計算全體工時、津貼、薪資數據
  const payrollRecords = crewList.map(crew => {
    const workHours = calculateCrewWorkHours(crew, selectedMonth, schedules, leaveRequests);
    const allowances = calculateCrewAllowances(crew, selectedMonth, schedules, routes, vessels, allowanceRules);
    return calculateCrewMonthlyPayroll(crew, selectedMonth, workHours, allowances);
  });

  const totalPayrollGross = payrollRecords.reduce((sum, p) => sum + p.grossSalary, 0);
  const totalPayrollNet = payrollRecords.reduce((sum, p) => sum + p.netSalary, 0);
  const totalAllowances = payrollRecords.reduce((sum, p) => sum + p.allowancesTotal, 0);
  const totalOvertime = payrollRecords.reduce((sum, p) => sum + p.overtimePay, 0);

  // 計算每艘船舶的當月人事營運成本
  const vesselCostBreakdown = vessels.map(v => {
    // 找出當月在此船執勤的所有排班
    const vesselSchedules = schedules.filter(s => s.vesselId === v.id && s.date.startsWith(selectedMonth));
    const dutyCount = vesselSchedules.length;
    
    // 估算該船分攤之人事成本 (底薪比例 + 專屬航次/噸位津貼)
    const estimatedCost = Math.round(dutyCount * 3800 + (v.tonnage >= 497 ? 50000 : 25000));

    return {
      vessel: v,
      dutyCount,
      estimatedCost,
      percentage: totalPayrollGross > 0 ? ((estimatedCost / totalPayrollGross) * 100).toFixed(1) : '0',
    };
  });

  // 匯出當前報表
  const handleExportCurrentReport = () => {
    if (reportType === 'HR_SUMMARY') {
      const headers = ['船員姓名', '職務', '國籍', '出勤天數', '休假天數', '底薪', '津貼合計', '加班費', '應發總額', '實發總額'];
      const rows = payrollRecords.map(p => [
        p.crewName, p.role, p.nationality === 'TW' ? '本國籍' : '外籍固定',
        p.dutyDays, p.leaveDays, p.baseSalary, p.allowancesTotal, p.overtimePay, p.grossSalary, p.netSalary
      ]);
      exportToCSV(`人事業務會計總表_${selectedMonth}`, headers, rows);
    } else if (reportType === 'VESSEL_COST') {
      const headers = ['船舶名稱', '噸位分類', '法定最低安全配置', '當月總執勤人次', '預估人事營運成本(NTD)', '成本佔比'];
      const rows = vesselCostBreakdown.map(vc => [
        vc.vessel.name, vc.vessel.tonnageCategory, vc.vessel.minSafetyManning, vc.dutyCount, vc.estimatedCost, `${vc.percentage}%`
      ]);
      exportToCSV(`各船舶人事營運成本分析表_${selectedMonth}`, headers, rows);
    } else {
      const headers = ['船員代碼', '船員姓名', '法定應休天數', '當月已休天數', '剩餘餘假', '年度特休總額', '已用特休', '特休餘額'];
      const rows = crewList.filter(c => c.nationality === 'TW').map(c => [
        c.code, c.name, c.standardMonthlyRestDays, c.takenMonthlyRestDays,
        c.standardMonthlyRestDays - c.takenMonthlyRestDays,
        c.annualLeaveTotal, c.annualLeaveTaken, c.annualLeaveTotal - c.annualLeaveTaken
      ]);
      exportToCSV(`全體船員休假餘假結算表_${selectedMonth}`, headers, rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-800">人事與會計決策報表中心 ({selectedMonth})</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              自動整合全船隊排班、工時、休假、津貼與薪資數據，一鍵產出人事業務月報與各船成本分析。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              列印報表
            </button>
            <button
              onClick={handleExportCurrentReport}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              匯出 Excel (CSV)
            </button>
          </div>
        </div>

        {/* Report Selector Tabs */}
        <div className="flex space-x-2 mt-5 border-t border-slate-100 pt-4">
          <button
            onClick={() => setReportType('HR_SUMMARY')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              reportType === 'HR_SUMMARY'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全體船員人事薪酬彙總月報
          </button>
          <button
            onClick={() => setReportType('VESSEL_COST')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              reportType === 'VESSEL_COST'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            各船舶營運人事成本分析
          </button>
          <button
            onClick={() => setReportType('LEAVE_STATUS')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              reportType === 'LEAVE_STATUS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            休假／餘假／特休盤點報表
          </button>
        </div>
      </div>

      {/* Report 1: HR Summary */}
      {reportType === 'HR_SUMMARY' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">
              【人事月報】全體船員 (46 人) 薪酬津貼與出勤工時綜合月報
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              總發放金額：${totalPayrollNet.toLocaleString()} NTD
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">船員姓名</th>
                  <th className="py-2.5 px-3">職務</th>
                  <th className="py-2.5 px-3 text-center">出勤天數</th>
                  <th className="py-2.5 px-3 text-center">已休天數</th>
                  <th className="py-2.5 px-3 text-right">基本底薪</th>
                  <th className="py-2.5 px-3 text-right">各項津貼</th>
                  <th className="py-2.5 px-3 text-right">加班費</th>
                  <th className="py-2.5 px-3 text-right">應發總額</th>
                  <th className="py-2.5 px-4 text-right font-bold text-slate-900">實發總額 (Net)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {payrollRecords.map(p => (
                  <tr key={p.crewId} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{p.crewName}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">{p.role}</td>
                    <td className="py-2.5 px-3 text-center">{p.dutyDays}</td>
                    <td className="py-2.5 px-3 text-center">{p.leaveDays}</td>
                    <td className="py-2.5 px-3 text-right">${p.baseSalary.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-indigo-600">+${p.allowancesTotal.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-amber-600">+${p.overtimePay.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-800">${p.grossSalary.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right font-black text-emerald-700 text-sm">${p.netSalary.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 2: Vessel Cost Analysis */}
      {reportType === 'VESSEL_COST' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-800">各營運船舶人事預算與津貼分攤</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">船舶名稱</th>
                    <th className="py-3 px-3">噸位等級</th>
                    <th className="py-3 px-3 text-center">法定最低安全配置</th>
                    <th className="py-3 px-3 text-center">當月總排班人次</th>
                    <th className="py-3 px-4 text-right">分攤人事營運成本</th>
                    <th className="py-3 px-3 text-right">成本佔比</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {vesselCostBreakdown.map((vc) => (
                    <tr key={vc.vessel.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">{vc.vessel.name}</td>
                      <td className="py-3 px-3 font-sans text-slate-600">{vc.vessel.tonnageCategory}</td>
                      <td className="py-3 px-3 text-center">{vc.vessel.minSafetyManning} 人</td>
                      <td className="py-3 px-3 text-center">{vc.dutyCount} 人天</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">${vc.estimatedCost.toLocaleString()} NTD</td>
                      <td className="py-3 px-3 text-right text-blue-600 font-bold">{vc.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visual Ratio Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              營運成本分攤長條比率
            </h4>

            <div className="space-y-3 pt-2">
              {vesselCostBreakdown.map((vc) => (
                <div key={vc.vessel.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800">{vc.vessel.name}</span>
                    <span className="text-blue-600 font-mono">{vc.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${vc.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report 3: Leave Status Summary */}
      {reportType === 'LEAVE_STATUS' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-800">
              本國籍船員當月應休／已休／餘假與年度特休盤點清冊
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">船員代碼 / 姓名</th>
                  <th className="py-2.5 px-3">職務</th>
                  <th className="py-2.5 px-3 text-center">當月法定應休</th>
                  <th className="py-2.5 px-3 text-center">當月已休天數</th>
                  <th className="py-2.5 px-3 text-center font-bold text-indigo-600">剩餘可休餘假</th>
                  <th className="py-2.5 px-3 text-center">年度特休總額</th>
                  <th className="py-2.5 px-3 text-center">特休已用天數</th>
                  <th className="py-2.5 px-4 text-center font-bold text-emerald-600">特休剩餘天數</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {crewList.filter(c => c.nationality === 'TW').map((c) => {
                  const remMonthly = Math.max(0, c.standardMonthlyRestDays - c.takenMonthlyRestDays);
                  const remAnnual = Math.max(0, c.annualLeaveTotal - c.annualLeaveTaken);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900">
                        {c.code} {c.name}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">{c.role}</td>
                      <td className="py-2.5 px-3 text-center">{c.standardMonthlyRestDays} 天</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{c.takenMonthlyRestDays} 天</td>
                      <td className="py-2.5 px-3 text-center font-bold text-indigo-700 text-sm">{remMonthly} 天</td>
                      <td className="py-2.5 px-3 text-center">{c.annualLeaveTotal} 天</td>
                      <td className="py-2.5 px-3 text-center">{c.annualLeaveTaken} 天</td>
                      <td className="py-2.5 px-4 text-center font-bold text-emerald-700 text-sm">{remAnnual} 天</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
