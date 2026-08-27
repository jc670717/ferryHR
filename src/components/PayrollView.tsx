import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Download, 
  Printer, 
  FileText, 
  DollarSign, 
  CheckCircle2, 
  Receipt,
  Eye,
  Ship,
  Sparkles
} from 'lucide-react';
import { 
  CrewMember, 
  ScheduleEntry, 
  LeaveRequest, 
  Route, 
  Vessel, 
  AllowanceRule, 
  PayrollRecord 
} from '../types';
import { 
  calculateCrewWorkHours, 
  calculateCrewAllowances, 
  calculateCrewMonthlyPayroll, 
  exportToCSV 
} from '../services/payrollEngine';

interface PayrollViewProps {
  crewList: CrewMember[];
  schedules: ScheduleEntry[];
  leaveRequests: LeaveRequest[];
  routes: Route[];
  vessels: Vessel[];
  rules: AllowanceRule[];
  selectedMonth: string;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  crewList,
  schedules,
  leaveRequests,
  routes,
  vessels,
  rules,
  selectedMonth,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);

  // 計算全體船員整月薪資
  const payrollRecords: PayrollRecord[] = crewList.map(crew => {
    const workHours = calculateCrewWorkHours(crew, selectedMonth, schedules, leaveRequests);
    const allowances = calculateCrewAllowances(crew, selectedMonth, schedules, routes, vessels, rules);
    return calculateCrewMonthlyPayroll(crew, selectedMonth, workHours, allowances);
  });

  const filteredRecords = payrollRecords.filter(p => 
    p.crewName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.crewId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 匯總財務統計指標
  const totalBaseSalary = payrollRecords.reduce((sum, p) => sum + p.baseSalary, 0);
  const totalAllowances = payrollRecords.reduce((sum, p) => sum + p.allowancesTotal, 0);
  const totalOvertimePay = payrollRecords.reduce((sum, p) => sum + p.overtimePay, 0);
  const totalDeductions = payrollRecords.reduce((sum, p) => sum + p.totalDeductions, 0);
  const totalGrossSalary = payrollRecords.reduce((sum, p) => sum + p.grossSalary, 0);
  const totalNetSalary = payrollRecords.reduce((sum, p) => sum + p.netSalary, 0);

  // 匯出薪資彙總報表
  const handleExportPayroll = () => {
    const headers = [
      '船員代碼', '船員姓名', '國籍', '職務', '計薪月份', 
      '基本底薪', '各項津貼合計', '加班費', '安全績效獎金', 
      '應發薪資總額', '勞健保與稅額扣項', '實發薪資總額', '出勤天數', '休假天數'
    ];

    const rows = filteredRecords.map(p => [
      p.crewId,
      p.crewName,
      p.nationality === 'TW' ? '本國籍' : '外籍固定',
      p.role,
      p.month,
      p.baseSalary,
      p.allowancesTotal,
      p.overtimePay,
      p.specialBonus,
      p.grossSalary,
      p.totalDeductions,
      p.netSalary,
      p.dutyDays,
      p.leaveDays
    ]);

    exportToCSV(`全體船員薪資彙總表_${selectedMonth}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-800">
                整月船員薪資自動核算與結算中心 ({selectedMonth})
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              自動整合基本薪資 ＋ 各項航行/噸位津貼 ＋ 加班費 ＋ 績效獎金 － 法定代扣款，提供人事與會計即時結算。
            </p>
          </div>

          <button
            onClick={handleExportPayroll}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            匯出全體薪資彙總表 (Excel)
          </button>
        </div>

        {/* Financial Summary Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-[11px] text-slate-500 font-medium">基本底薪總額</div>
            <div className="text-lg font-black text-slate-800 font-mono mt-1">
              ${totalBaseSalary.toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
            <div className="text-[11px] text-indigo-700 font-medium">各項津貼總額</div>
            <div className="text-lg font-black text-indigo-900 font-mono mt-1">
              ${totalAllowances.toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
            <div className="text-[11px] text-amber-700 font-medium">加班薪資總額</div>
            <div className="text-lg font-black text-amber-900 font-mono mt-1">
              ${totalOvertimePay.toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
            <div className="text-[11px] text-rose-700 font-medium">法定代扣總額</div>
            <div className="text-lg font-black text-rose-900 font-mono mt-1">
              -${totalDeductions.toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl">
            <div className="text-[11px] text-blue-700 font-medium">應發薪資總計 (Gross)</div>
            <div className="text-lg font-black text-blue-900 font-mono mt-1">
              ${totalGrossSalary.toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-xs">
            <div className="text-[11px] text-emerald-100 font-medium">實發薪資總計 (Net)</div>
            <div className="text-xl font-black text-white font-mono mt-1">
              ${totalNetSalary.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 pt-4 border-t border-slate-100 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜尋船員姓名..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">船員代碼 / 姓名</th>
                <th className="py-3 px-3">職務</th>
                <th className="py-3 px-3 text-center">出勤/休假</th>
                <th className="py-3 px-3 text-right">基本薪資</th>
                <th className="py-3 px-3 text-right">津貼合計</th>
                <th className="py-3 px-3 text-right">加班費</th>
                <th className="py-3 px-3 text-right">應發金額</th>
                <th className="py-3 px-3 text-right">應扣項目</th>
                <th className="py-3 px-4 text-right font-bold text-slate-900">實發金額 (Net)</th>
                <th className="py-3 px-3 text-center">個人薪資單</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredRecords.map((p) => (
                <tr key={p.crewId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-sans font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {p.crewId}
                      </span>
                      <span>{p.crewName}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3 font-sans font-semibold text-slate-700">
                    {p.role}
                  </td>

                  <td className="py-3 px-3 text-center font-sans text-[11px] text-slate-600">
                    {p.dutyDays}出 / {p.leaveDays}休
                  </td>

                  <td className="py-3 px-3 text-right text-slate-700">
                    ${p.baseSalary.toLocaleString()}
                  </td>

                  <td className="py-3 px-3 text-right text-indigo-600 font-bold">
                    +${p.allowancesTotal.toLocaleString()}
                  </td>

                  <td className="py-3 px-3 text-right text-amber-600">
                    {p.overtimePay > 0 ? `+$${p.overtimePay.toLocaleString()}` : '$0'}
                  </td>

                  <td className="py-3 px-3 text-right text-slate-900 font-bold">
                    ${p.grossSalary.toLocaleString()}
                  </td>

                  <td className="py-3 px-3 text-right text-rose-600">
                    -${p.totalDeductions.toLocaleString()}
                  </td>

                  <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                    ${p.netSalary.toLocaleString()}
                  </td>

                  <td className="py-3 px-3 text-center font-sans">
                    <button
                      onClick={() => setSelectedPayroll(p)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      薪資單
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Modal (個人薪資明細單) */}
      {selectedPayroll && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">船員個人薪資發放明細單</h3>
              </div>
              <button
                onClick={() => setSelectedPayroll(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Formal Payslip Layout */}
            <div className="space-y-4 py-4 text-xs font-sans">
              {/* Header Info */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-400">船員姓名：</span>
                  <strong className="text-slate-900 ml-1">{selectedPayroll.crewName}</strong>
                </div>
                <div>
                  <span className="text-slate-400">職務：</span>
                  <strong className="text-slate-900 ml-1">{selectedPayroll.role}</strong>
                </div>
                <div>
                  <span className="text-slate-400">計薪月份：</span>
                  <strong className="text-slate-900 ml-1 font-mono">{selectedPayroll.month}</strong>
                </div>
                <div>
                  <span className="text-slate-400">出勤天數：</span>
                  <strong className="text-slate-900 ml-1">{selectedPayroll.dutyDays} 天</strong>
                </div>
                <div>
                  <span className="text-slate-400">已休天數：</span>
                  <strong className="text-slate-900 ml-1">{selectedPayroll.leaveDays} 天</strong>
                </div>
                <div>
                  <span className="text-slate-400">剩餘餘假：</span>
                  <strong className="text-slate-900 ml-1">{selectedPayroll.remainingLeaveDays} 天</strong>
                </div>
              </div>

              {/* Earnings & Allowances Breakdown */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center justify-between">
                  <span>應發薪資項目 (Earnings)</span>
                  <span className="text-blue-600 font-mono font-bold">${selectedPayroll.grossSalary.toLocaleString()} NTD</span>
                </h4>
                <div className="space-y-1.5 border border-slate-200 rounded-lg p-3 bg-white font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">基本底薪 (Base Salary)</span>
                    <span className="font-bold text-slate-900">${selectedPayroll.baseSalary.toLocaleString()}</span>
                  </div>

                  {selectedPayroll.allowanceDetails.map((item, i) => (
                    <div key={i} className="flex justify-between py-1 text-slate-600 text-[11px]">
                      <span>{item.ruleName} ({item.quantity}{item.unit})</span>
                      <span className="text-indigo-600 font-semibold">+${item.amount.toLocaleString()}</span>
                    </div>
                  ))}

                  {selectedPayroll.overtimePay > 0 && (
                    <div className="flex justify-between py-1 text-slate-600">
                      <span>加班薪資 ({selectedPayroll.overtimeHours} 小時)</span>
                      <span className="text-amber-600 font-semibold">+${selectedPayroll.overtimePay.toLocaleString()}</span>
                    </div>
                  )}

                  {selectedPayroll.specialBonus > 0 && (
                    <div className="flex justify-between py-1 text-slate-600">
                      <span>安全出勤績效獎金</span>
                      <span className="text-emerald-600 font-semibold">+${selectedPayroll.specialBonus.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center justify-between">
                  <span>應扣項目 (Deductions)</span>
                  <span className="text-rose-600 font-mono font-bold">-${selectedPayroll.totalDeductions.toLocaleString()} NTD</span>
                </h4>
                <div className="space-y-1.5 border border-slate-200 rounded-lg p-3 bg-white font-mono">
                  {selectedPayroll.deductions.map((d) => (
                    <div key={d.id} className="flex justify-between py-0.5 text-slate-600 text-[11px]">
                      <span>{d.name}</span>
                      <span className="text-rose-600">-${d.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Net Total Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-800 font-medium">當月實際應發實領金額 (Net Payable)</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">匯入船員指定薪資帳戶</div>
                </div>
                <div className="text-2xl font-black text-emerald-800 font-mono">
                  ${selectedPayroll.netSalary.toLocaleString()} <span className="text-xs font-normal">NTD</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                列印薪資單
              </button>
              <button
                onClick={() => setSelectedPayroll(null)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
