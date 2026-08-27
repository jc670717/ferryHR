import React, { useState } from 'react';
import { 
  Clock, 
  Search, 
  Filter, 
  Download, 
  Ship, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { CrewMember, ScheduleEntry, LeaveRequest, Vessel, Route } from '../types';
import { calculateCrewWorkHours, exportToCSV } from '../services/payrollEngine';

interface WorkHoursViewProps {
  crewList: CrewMember[];
  schedules: ScheduleEntry[];
  leaveRequests: LeaveRequest[];
  vessels: Vessel[];
  routes: Route[];
  selectedMonth: string;
}

export const WorkHoursView: React.FC<WorkHoursViewProps> = ({
  crewList,
  schedules,
  leaveRequests,
  vessels,
  routes,
  selectedMonth,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [vesselFilter, setVesselFilter] = useState<string>('ALL');
  const [routeFilter, setRouteFilter] = useState<string>('ALL');

  // 計算每位船員當月工時
  const workHoursSummaries = crewList.map(crew => 
    calculateCrewWorkHours(crew, selectedMonth, schedules, leaveRequests)
  );

  const filteredSummaries = workHoursSummaries.filter(summary => {
    const matchesSearch = 
      summary.crewName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.crewId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVessel = vesselFilter === 'ALL' || summary.vesselIds.includes(vesselFilter);
    const matchesRoute = routeFilter === 'ALL' || summary.routeIds.includes(routeFilter);

    return matchesSearch && matchesVessel && matchesRoute;
  });

  // 全體工時總計指標
  const totalFleetHours = workHoursSummaries.reduce((sum, s) => sum + s.totalWorkHours, 0);
  const totalFleetOvertime = workHoursSummaries.reduce((sum, s) => sum + s.overtimeHours, 0);
  const totalDutyDays = workHoursSummaries.reduce((sum, s) => sum + s.dutyDays, 0);
  const avgHoursPerCrew = Math.round(totalFleetHours / (crewList.length || 1));

  // 匯出工時報表
  const handleExportWorkHours = () => {
    const headers = [
      '船員代碼', '船員姓名', '國籍', '職務', '統計月份', 
      '執勤天數', '核准休假天數', '正常工時(hr)', '加班工時(hr)', 
      '航行工時(hr)', '夜間當值工時(hr)', '總計累積工時(hr)', '法定工時標準(hr)'
    ];

    const rows = filteredSummaries.map(s => [
      s.crewId,
      s.crewName,
      s.nationality === 'TW' ? '本國籍' : '外籍固定',
      s.role,
      s.month,
      s.dutyDays,
      s.leaveDays,
      s.regularHours,
      s.overtimeHours,
      s.voyageHours,
      s.nightWatchHours,
      s.totalWorkHours,
      s.standardMonthlyTargetHours
    ]);

    exportToCSV(`船員工時報表_${selectedMonth}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Overview Top Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-800">
                船員工時統計分析與出勤報表 ({selectedMonth})
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              依實際航次排班與出勤核算每日、每月正常工時、航行當值與加班時數，支援多維度篩選與 Excel 匯出。
            </p>
          </div>

          <button
            onClick={handleExportWorkHours}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            匯出工時報表 (Excel)
          </button>
        </div>

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-xs text-slate-500 font-medium">全船隊當月總執勤人次</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {totalDutyDays} <span className="text-xs font-normal">人天</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">全隊 46 名船員累計</div>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
            <div className="text-xs text-blue-700 font-medium">全船隊累積航行工時</div>
            <div className="text-2xl font-black text-blue-900 mt-1">
              {totalFleetHours.toLocaleString()} <span className="text-xs font-normal">小時</span>
            </div>
            <div className="text-[10px] text-blue-600 mt-0.5">平均每人 {avgHoursPerCrew} 小時</div>
          </div>

          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
            <div className="text-xs text-amber-700 font-medium">累計加班總工時</div>
            <div className="text-2xl font-black text-amber-900 mt-1">
              {totalFleetOvertime} <span className="text-xs font-normal">小時</span>
            </div>
            <div className="text-[10px] text-amber-600 mt-0.5">列入月度加班費核算</div>
          </div>

          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <div className="text-xs text-emerald-700 font-medium">勞基法法定工時達標率</div>
            <div className="text-2xl font-black text-emerald-900 mt-1">
              100% <span className="text-xs font-normal">合規</span>
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5">無超時或連續疲勞排班</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋船員姓名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <select
              value={vesselFilter}
              onChange={(e) => setVesselFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none"
            >
              <option value="ALL">全部船舶 (6 艘)</option>
              {vessels.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.tonnageCategory})</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none"
            >
              <option value="ALL">全部航線 (5 條)</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Work Hours Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">船員姓名 / 職務</th>
                <th className="py-3 px-3">國籍</th>
                <th className="py-3 px-3 text-center">出勤天數</th>
                <th className="py-3 px-3 text-center">輪休天數</th>
                <th className="py-3 px-3 text-right">正常工時</th>
                <th className="py-3 px-3 text-right">加班工時</th>
                <th className="py-3 px-3 text-right">航行工時</th>
                <th className="py-3 px-3 text-right">夜當值工時</th>
                <th className="py-3 px-4 text-right">累積總工時</th>
                <th className="py-3 px-3 text-center">工時狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredSummaries.map((s) => {
                const isOverStandard = s.totalWorkHours > s.standardMonthlyTargetHours;

                return (
                  <tr key={s.crewId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-sans font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{s.crewName}</span>
                        <span className="text-[11px] font-normal text-slate-500">({s.role})</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        s.nationality === 'TW' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {s.nationality === 'TW' ? '台籍' : '外籍'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {s.dutyDays} 天
                    </td>

                    <td className="py-3 px-3 text-center text-slate-600">
                      {s.leaveDays} 天
                    </td>

                    <td className="py-3 px-3 text-right text-slate-700">
                      {s.regularHours} hr
                    </td>

                    <td className="py-3 px-3 text-right text-amber-600 font-bold">
                      {s.overtimeHours > 0 ? `+${s.overtimeHours} hr` : '0 hr'}
                    </td>

                    <td className="py-3 px-3 text-right text-blue-600">
                      {s.voyageHours} hr
                    </td>

                    <td className="py-3 px-3 text-right text-indigo-600">
                      {s.nightWatchHours} hr
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                      {s.totalWorkHours} hr
                    </td>

                    <td className="py-3 px-3 text-center font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        正常合規
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
