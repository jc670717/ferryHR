import React, { useState } from 'react';
import { 
  Coins, 
  Search, 
  Download, 
  Info, 
  Award, 
  Ship, 
  Navigation, 
  CheckCircle2, 
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { CrewMember, ScheduleEntry, Route, Vessel, AllowanceRule, CrewAllowanceSummary } from '../types';
import { calculateCrewAllowances, exportToCSV } from '../services/payrollEngine';

interface AllowanceViewProps {
  crewList: CrewMember[];
  schedules: ScheduleEntry[];
  routes: Route[];
  vessels: Vessel[];
  rules: AllowanceRule[];
  selectedMonth: string;
}

export const AllowanceView: React.FC<AllowanceViewProps> = ({
  crewList,
  schedules,
  routes,
  vessels,
  rules,
  selectedMonth,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCrewSummary, setSelectedCrewSummary] = useState<CrewAllowanceSummary | null>(null);

  // 計算每位船員津貼總額與明細
  const allowanceSummaries = crewList.map(crew => 
    calculateCrewAllowances(crew, selectedMonth, schedules, routes, vessels, rules)
  );

  const filteredSummaries = allowanceSummaries.filter(summary => 
    summary.crewName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    summary.crewId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 全體津貼合計
  const totalFleetAllowance = allowanceSummaries.reduce((sum, s) => sum + s.totalAllowance, 0);

  // 匯出津貼報表
  const handleExportAllowances = () => {
    const headers = [
      '船員代碼', '船員姓名', '職務', '月份', 
      '津貼項目', '單價/費率', '數量', '單位', '津貼金額(NTD)', '計算追溯依據'
    ];

    const rows: (string | number)[][] = [];
    filteredSummaries.forEach(s => {
      s.items.forEach(item => {
        rows.push([
          s.crewId,
          s.crewName,
          s.role,
          s.month,
          item.ruleName,
          item.unitRate,
          item.quantity,
          item.unit,
          item.amount,
          item.calculationBasis
        ]);
      });
    });

    exportToCSV(`船員津貼明細表_${selectedMonth}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Coins className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-800">
                各項船員津貼自動核算與計算依據追溯 ({selectedMonth})
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              系統依船舶噸位、航次航線、適任專業職位、夜航當值及臨時代班規則自動計發，每筆款項皆具備 100% 透明追溯依據。
            </p>
          </div>

          <button
            onClick={handleExportAllowances}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            匯出津貼明細表 (Excel)
          </button>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div className="p-4 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl shadow-xs">
            <div className="text-xs text-indigo-300">全船隊當月津貼總核發金額</div>
            <div className="text-3xl font-black text-amber-300 font-mono mt-1">
              ${totalFleetAllowance.toLocaleString()} <span className="text-xs text-white font-normal">NTD</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">全隊 46 名船員津貼總額</div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-xs text-slate-500">已啟用津貼核算法則</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {rules.filter(r => r.isActive).length} <span className="text-xs font-normal">項動態規則</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">航次津貼、497T/350T噸位加給、一等專業職務加給等</div>
          </div>

          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
            <div className="text-xs text-blue-700">計算依據審核機制</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              100% <span className="text-xs font-normal">可追溯審計</span>
            </div>
            <div className="text-[10px] text-blue-600 mt-1">點擊船員即可查看每日航次公式與出勤計算依據</div>
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

      {/* Allowance Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">船員姓名 / 職務</th>
                <th className="py-3 px-3 text-center">核發項目數</th>
                <th className="py-3 px-4">津貼項目涵蓋概況</th>
                <th className="py-3 px-4 text-right">當月各項津貼合計</th>
                <th className="py-3 px-4 text-center">計算依據追溯</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSummaries.map((summary) => (
                <tr key={summary.crewId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>{summary.crewName}</span>
                      <span className="text-[11px] font-normal text-slate-500">({summary.role})</span>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center font-bold text-slate-700">
                    {summary.items.length} 項
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {summary.items.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                        >
                          {item.ruleName} (${item.amount.toLocaleString()})
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                    ${summary.totalAllowance.toLocaleString()}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedCrewSummary(summary)}
                      className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 mx-auto"
                    >
                      <Info className="w-3.5 h-3.5" />
                      追溯依據
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trace Audit Detail Modal */}
      {selectedCrewSummary && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-indigo-600" />
                  【{selectedCrewSummary.crewName}】{selectedMonth} 津貼計算依據追溯單
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  職務：<strong>{selectedCrewSummary.role}</strong> ‧ 當月津貼合計：<strong className="text-slate-900 font-mono">${selectedCrewSummary.totalAllowance.toLocaleString()}</strong> NTD
                </p>
              </div>
              <button
                onClick={() => setSelectedCrewSummary(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs">
              {selectedCrewSummary.items.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      {item.ruleName}
                    </div>
                    <div className="font-mono font-bold text-indigo-600 text-sm">
                      ${item.amount.toLocaleString()} <span className="text-xs text-slate-500 font-normal">NTD</span>
                    </div>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200 text-slate-700 font-mono text-[11px]">
                    {item.calculationBasis}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                onClick={() => setSelectedCrewSummary(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
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
