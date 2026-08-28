import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Ship, 
  Users, 
  ArrowLeftRight, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Check, 
  Edit2, 
  RefreshCw, 
  AlertCircle,
  Compass,
  Layers,
  Zap
} from 'lucide-react';
import { 
  Vessel, 
  CrewMember, 
  ScheduleEntry, 
  LeaveRequest, 
  ComplianceValidation, 
  UserRole,
  CrewRole
} from '../types';
import { generateAutoSchedule, validateSchedules, checkCrewQualification } from '../services/schedulingEngine';
import { DailyTripDispatchModal } from './DailyTripDispatchModal';

interface AutoSchedulingViewProps {
  selectedMonth: string;
  vessels: Vessel[];
  crewList: CrewMember[];
  leaveRequests: LeaveRequest[];
  schedules: ScheduleEntry[];
  compliance: ComplianceValidation;
  userRole: UserRole;
  currentCrewId?: string;
  onUpdateSchedules: (newSchedules: ScheduleEntry[]) => void;
  onAddAuditLog: (action: string, targetType: any, targetId: string, targetName: string, details: string) => void;
}

export const AutoSchedulingView: React.FC<AutoSchedulingViewProps> = ({
  selectedMonth,
  vessels,
  crewList,
  leaveRequests,
  schedules,
  compliance,
  userRole,
  currentCrewId,
  onUpdateSchedules,
  onAddAuditLog,
}) => {
  const [viewMode, setViewMode] = useState<'BY_VESSEL' | 'BY_DATE'>('BY_VESSEL');
  const [selectedVesselId, setSelectedVesselId] = useState<string>(vessels[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(`${selectedMonth}-01`);
  const [manualModalEntry, setManualModalEntry] = useState<{
    vesselId: string;
    date: string;
    role: CrewRole;
    existingEntry?: ScheduleEntry;
  } | null>(null);

  // Daily Trip-by-Trip dispatch modal state
  const [isTripModalOpen, setIsTripModalOpen] = useState<boolean>(false);
  const [tripModalDate, setTripModalDate] = useState<string>(`${selectedMonth}-01`);
  const [tripModalVesselId, setTripModalVesselId] = useState<string>(vessels[0]?.id || '');

  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => {
    const day = (i + 1).toString().padStart(2, '0');
    return `${selectedMonth}-${day}`;
  });

  const selectedVessel = vessels.find(v => v.id === selectedVesselId) || vessels[0];
  const isReadOnly = userRole === 'CREW';

  // 處理班次級派工儲存
  const handleSaveTripAssignments = (date: string, newEntries: ScheduleEntry[]) => {
    // 移除當日所有舊排班，替換為班次派工產生的新排班
    const remaining = schedules.filter(s => s.date !== date);
    const updatedList = [...remaining, ...newEntries];
    onUpdateSchedules(updatedList);
    onAddAuditLog(
      'TRIP_DISPATCH',
      'SCHEDULE',
      `TRIP-${date}`,
      `${date} 每日每班次精準調度`,
      `更新 ${date} 班次派工名冊 (共 ${newEntries.length} 位船員/航次)，同步連動工時與防疲勞計算`
    );
  };

  // 執行智慧自動排班
  const handleRunAutoSchedule = () => {
    const result = generateAutoSchedule(selectedMonth, vessels, crewList, leaveRequests);
    onUpdateSchedules(result.schedules);
    onAddAuditLog(
      'AUTO_SCHEDULE',
      'SCHEDULE',
      `SCH-${selectedMonth}`,
      `${selectedMonth} 月度班表`,
      `執行全自動排班引擎，依5艘營運船舶安全配置表、STCW證書與外籍固定配置產出推薦排班`
    );
  };

  // 手動調班儲存
  const handleAssignCrew = (newCrewId: string, isCover = false) => {
    if (!manualModalEntry) return;

    const { vesselId, date, role, existingEntry } = manualModalEntry;
    const vessel = vessels.find(v => v.id === vesselId);
    const assignedCrew = crewList.find(c => c.id === newCrewId);

    let updatedList = [...schedules];

    if (existingEntry) {
      // 替換現有排班
      updatedList = updatedList.map(s => {
        if (s.id === existingEntry.id) {
          return {
            ...s,
            crewId: newCrewId,
            isCover,
            coverForCrewId: isCover ? existingEntry.crewId : undefined,
            notes: isCover ? `手動調班 (代理 ${crewList.find(c => c.id === existingEntry.crewId)?.name})` : '手動調整指派',
          };
        }
        return s;
      });
    } else {
      // 新增排班
      const newEntry: ScheduleEntry = {
        id: `SCH-${vesselId}-${date}-${newCrewId}`,
        date,
        vesselId,
        routeId: vessel?.routeId || '',
        role,
        crewId: newCrewId,
        shift: 'VOYAGE',
        isCover,
        status: 'SCHEDULED',
        plannedHours: 8,
        actualHours: 8,
        notes: isCover ? '手動臨時代班' : '手動增派排班',
      };
      updatedList.push(newEntry);
    }

    onUpdateSchedules(updatedList);
    onAddAuditLog(
      'MANUAL_SCHEDULE',
      'SCHEDULE',
      `SCH-${vesselId}-${date}`,
      `${vessel?.name || vesselId} ${date} 調班`,
      `調整【${role}】由船員【${assignedCrew?.name}】執勤 (代班標記: ${isCover ? '是' : '否'})`
    );

    setManualModalEntry(null);
  };

  // 取得特定日期的合規性問題
  const getErrorsForDate = (date: string, vesselId?: string) => {
    return compliance.errors.filter(e => {
      const matchDate = e.date === date;
      const matchVessel = !vesselId || e.vesselId === vesselId;
      return matchDate && matchVessel;
    });
  };

  // 尋找符合該船該職務的合格候選船員清單
  const getQualifiedCandidates = (vessel: Vessel, role: CrewRole, date: string) => {
    const assignedToday = new Set(
      schedules.filter(s => s.date === date && s.status !== 'CANCELLED').map(s => s.crewId)
    );
    const approvedLeaves = new Set(
      leaveRequests.filter(l => l.date === date && l.status === 'APPROVED').map(l => l.crewId)
    );

    return crewList.map(crew => {
      const qual = checkCrewQualification(crew, vessel, role, date);
      const isAlreadyAssigned = assignedToday.has(crew.id);
      const isOnLeave = approvedLeaves.has(crew.id);
      const monthlyShifts = schedules.filter(s => s.crewId === crew.id && s.date.startsWith(selectedMonth)).length;

      return {
        crew,
        qual,
        isAlreadyAssigned,
        isOnLeave,
        monthlyShifts,
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Controller Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-800">
                智慧自動排班與調度看板 ({selectedMonth})
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              自動分析船舶安全配置 ＋ 適任證書 ＋ 外籍固定配置 ＋ 休假排程，支援一鍵智慧排班與彈性人工調度。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('BY_VESSEL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'BY_VESSEL'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                依船舶檢視 (月看板)
              </button>
              <button
                onClick={() => setViewMode('BY_DATE')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'BY_DATE'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                依單日檢視 (全船隊)
              </button>
            </div>

            {/* Daily Trip Dispatch Button */}
            {!isReadOnly && (
              <button
                onClick={() => {
                  setTripModalDate(selectedDate);
                  setTripModalVesselId(selectedVesselId);
                  setIsTripModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all transform hover:scale-[1.02]"
              >
                <Compass className="w-4 h-4 text-slate-950" />
                每日每班次精準派工
              </button>
            )}

            {/* Run Auto Schedule Button */}
            {!isReadOnly && (
              <button
                id="run-auto-schedule-btn"
                onClick={handleRunAutoSchedule}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all transform hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                一鍵智慧自動推薦排班
              </button>
            )}
          </div>
        </div>

        {/* Real-time Compliance Status Banner */}
        <div className={`mt-4 p-3.5 rounded-xl border flex items-start gap-3 ${
          compliance.isValid 
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
            : 'bg-amber-50/90 border-amber-300 text-amber-950'
        }`}>
          {compliance.isValid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs flex-1">
            <div className="font-bold flex items-center gap-2">
              {compliance.isValid ? '全船隊排班 100% 符合船舶安全配置與適任資格規範' : `排班檢核提示：目前存在 ${compliance.errors.length} 項配置需注意`}
            </div>
            {!compliance.isValid && (
              <ul className="mt-1.5 space-y-1 list-disc list-inside text-[11px] text-amber-800">
                {compliance.errors.slice(0, 3).map((err, i) => (
                  <li key={i}>{err.message}</li>
                ))}
                {compliance.errors.length > 3 && (
                  <li>... 尚有 {compliance.errors.length - 3} 項配置提示，請檢視個別船舶或單日班表</li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Mode 1: By Vessel (Full Month Matrix) */}
      {viewMode === 'BY_VESSEL' && (
        <div className="space-y-4">
          {/* Vessel Tabs */}
          <div className="flex space-x-2 overflow-x-auto pb-1">
            {vessels.map((v) => {
              const isSelected = v.id === selectedVesselId;
              const hasErrors = compliance.errors.some(e => e.vesselId === v.id);

              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVesselId(v.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Ship className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                  <span>{v.name} ({v.tonnageCategory})</span>
                  {hasErrors && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" title="此船有待補足配置" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Roster Board Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  【{selectedVessel.name}】{selectedMonth} 月度輪值班表
                </h3>
                <span className="text-xs text-slate-500">
                  安全最低人數：{selectedVessel.minSafetyManning} 人 ‧ 編制職務：{selectedVessel.safetyRequirements.map(r => `${r.role} ${r.minCount}人`).join('、')}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                點擊班表格子可進行「調班 / 換人 / 代班 / 調船」
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-200 w-28 sticky left-0 bg-slate-100 z-10">編制職務</th>
                    {daysArray.map((d) => {
                      const dayNum = d.split('-')[2];
                      const dateObj = new Date(year, month - 1, Number(dayNum));
                      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                      const hasErr = getErrorsForDate(d, selectedVessel.id).length > 0;

                      return (
                        <th
                          key={d}
                          onClick={() => {
                            if (!isReadOnly) {
                              setTripModalDate(d);
                              setTripModalVesselId(selectedVessel.id);
                              setIsTripModalOpen(true);
                            }
                          }}
                          className={`py-2 px-1 text-center border-r border-slate-200 min-w-[44px] group transition-colors ${
                            !isReadOnly ? 'cursor-pointer hover:bg-amber-100/80' : ''
                          } ${
                            isWeekend ? 'bg-slate-200/60 font-bold' : ''
                          } ${hasErr ? 'bg-amber-100/70 text-amber-900' : ''}`}
                          title={!isReadOnly ? `點擊開啟 ${d} 每班次船員精準派工調度` : undefined}
                        >
                          <div className="text-[10px] text-slate-500">{['日','一','二','三','四','五','六'][dateObj.getDay()]}</div>
                          <div className="font-mono text-xs">{dayNum}</div>
                          {!isReadOnly && (
                            <div className="text-[8px] text-amber-700 opacity-0 group-hover:opacity-100 font-bold -mt-0.5">
                              派工
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedVessel.safetyRequirements.map((req) => {
                    // 每一列可能需要展開多個位置 (例如水手 3 人 -> 產生 3 列)
                    return Array.from({ length: req.minCount }).map((_, slotIdx) => (
                      <tr key={`${req.id}-${slotIdx}`} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/80 sticky left-0 z-10 flex items-center justify-between">
                          <span>{req.role} {req.minCount > 1 ? `#${slotIdx + 1}` : ''}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{req.requiredRank[0]}</span>
                        </td>

                        {daysArray.map((date) => {
                          // 尋找當天該船該職務的所有排班
                          const matchingSchedules = schedules.filter(
                            s => s.vesselId === selectedVessel.id && 
                                 s.date === date && 
                                 s.role === req.role &&
                                 s.status !== 'CANCELLED'
                          );

                          const currentEntry = matchingSchedules[slotIdx];
                          const crew = currentEntry ? crewList.find(c => c.id === currentEntry.crewId) : null;
                          const isSelf = currentCrewId && crew?.id === currentCrewId;

                          return (
                            <td
                              key={date}
                              onClick={() => {
                                if (!isReadOnly) {
                                  setManualModalEntry({
                                    vesselId: selectedVessel.id,
                                    date,
                                    role: req.role,
                                    existingEntry: currentEntry,
                                  });
                                }
                              }}
                              className={`py-1.5 px-1 text-center border-r border-slate-200 transition-colors ${
                                !isReadOnly ? 'cursor-pointer hover:bg-blue-50/80' : ''
                              } ${isSelf ? 'bg-amber-100/60 ring-1 ring-amber-400' : ''}`}
                            >
                              {crew ? (
                                <div className={`px-1 py-1 rounded text-[10px] font-medium leading-tight ${
                                  crew.nationality === 'TW'
                                    ? currentEntry.isCover
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                                      : 'bg-blue-100 text-blue-900 border border-blue-200'
                                    : 'bg-purple-100 text-purple-900 border border-purple-200'
                                }`}
                                title={`${crew.name} (${crew.rankLevel})${currentEntry.isCover ? ' [代班]' : ''}`}
                                >
                                  <div className="truncate font-semibold">{crew.name}</div>
                                  {currentEntry.isCover && (
                                    <div className="text-[8px] text-amber-700">代班</div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-300 py-1">-</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: By Date (Fleet-wide Daily Matrix) */}
      {viewMode === 'BY_DATE' && (
        <div className="space-y-4">
          {/* Date Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">選擇指定檢視日期：</span>
              <input
                type="date"
                value={selectedDate}
                min={`${selectedMonth}-01`}
                max={`${selectedMonth}-${daysInMonth.toString().padStart(2, '0')}`}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg"
              />
              <span className="text-xs text-slate-500 hidden md:inline">
                檢視全船隊 6 艘船舶在 {selectedDate} 之執勤、安全配置及休假船員狀態
              </span>
            </div>

            {!isReadOnly && (
              <button
                onClick={() => {
                  setTripModalDate(selectedDate);
                  setTripModalVesselId('ALL');
                  setIsTripModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-xs"
              >
                <Compass className="w-4 h-4 text-slate-950" />
                開啟 {selectedDate} 每班次派工調度
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vessels.map((v) => {
              const daySchedules = schedules.filter(
                s => s.vesselId === v.id && s.date === selectedDate && s.status !== 'CANCELLED'
              );
              const isShortManned = daySchedules.length < v.minSafetyManning;

              return (
                <div key={v.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{v.name}</div>
                      <div className="text-[11px] text-slate-500">{v.tonnageCategory} ‧ 法定最低 {v.minSafetyManning} 人</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      isShortManned ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      今日配置 {daySchedules.length} / {v.minSafetyManning} 人
                    </span>
                  </div>

                  {/* Scheduled Roles list */}
                  <div className="space-y-1.5">
                    {v.safetyRequirements.map((req) => {
                      const matched = daySchedules.filter(s => s.role === req.role);
                      return (
                        <div key={req.id} className="flex items-center justify-between text-xs py-1 px-2 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-700">{req.role} ({matched.length}/{req.minCount})</span>
                          <div className="flex flex-wrap gap-1">
                            {matched.map((s) => {
                              const crew = crewList.find(c => c.id === s.crewId);
                              return (
                                <span
                                  key={s.id}
                                  onClick={() => {
                                    if (!isReadOnly) {
                                      setManualModalEntry({
                                        vesselId: v.id,
                                        date: selectedDate,
                                        role: req.role,
                                        existingEntry: s,
                                      });
                                    }
                                  }}
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                                    crew?.nationality === 'TW'
                                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                      : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                  }`}
                                >
                                  {crew?.name} {s.isCover ? '(代)' : ''}
                                </span>
                              );
                            })}
                            {matched.length < req.minCount && (
                              <button
                                onClick={() => {
                                  if (!isReadOnly) {
                                    setManualModalEntry({
                                      vesselId: v.id,
                                      date: selectedDate,
                                      role: req.role,
                                    });
                                  }
                                }}
                                className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[10px] font-bold hover:bg-rose-100"
                              >
                                + 補派缺額
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual Assignment / Swap Modal */}
      {manualModalEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
                  人工調班 / 代班 / 調船指派
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  日期：<strong>{manualModalEntry.date}</strong> ‧ 船舶：<strong>{vessels.find(v => v.id === manualModalEntry.vesselId)?.name}</strong> ‧ 職務：<strong>{manualModalEntry.role}</strong>
                </p>
              </div>
              <button
                onClick={() => setManualModalEntry(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900">
                系統已自動篩選全公司符合【{manualModalEntry.role}】適任證書之船員，並標註當日出勤與休假狀態：
              </div>

              {/* Candidates List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(() => {
                  const targetVessel = vessels.find(v => v.id === manualModalEntry.vesselId)!;
                  const candidates = getQualifiedCandidates(targetVessel, manualModalEntry.role, manualModalEntry.date);

                  return candidates.map(({ crew, qual, isAlreadyAssigned, isOnLeave, monthlyShifts }) => {
                    const isCurrentlySelected = manualModalEntry.existingEntry?.crewId === crew.id;
                    const isAssignable = qual.isEligible && !isOnLeave && (!isAlreadyAssigned || isCurrentlySelected);

                    return (
                      <div
                        key={crew.id}
                        className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          !qual.isEligible
                            ? 'bg-rose-50/50 border-rose-200/70'
                            : isOnLeave
                            ? 'bg-amber-50/60 border-amber-200'
                            : isAlreadyAssigned && !isCurrentlySelected
                            ? 'bg-slate-100/80 border-slate-200'
                            : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 text-xs flex flex-wrap items-center gap-2">
                            <span>{crew.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-mono">
                              {crew.code}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-medium">
                              {crew.rankLevel}
                            </span>
                            {crew.nationality === 'FOREIGN' && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-purple-50 text-purple-700 rounded">
                                外籍固定 ({crew.fixedVesselId})
                              </span>
                            )}
                            {qual.isEligible ? (
                              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
                                ✓ 適任合格
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded font-bold">
                                ✕ 資格不符
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                            <span>本月已排班：<strong>{monthlyShifts}</strong> 天</span>
                            <span>‧</span>
                            <span>證書效期：{crew.certExpiryDate}</span>
                          </div>

                          {/* Status Flags & Disqualification Reasons */}
                          <div className="mt-1.5 space-y-1">
                            {isOnLeave && (
                              <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1 font-semibold">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                當日已核准休假中 (無法指派)
                              </div>
                            )}

                            {isAlreadyAssigned && !isCurrentlySelected && (
                              <div className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1 font-semibold">
                                <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                當日已在其他船舶排班執勤 (不可重複派工)
                              </div>
                            )}

                            {!qual.isEligible && (
                              <div className="text-[11px] text-rose-700 bg-rose-100/70 px-2 py-1 rounded border border-rose-300">
                                <div className="font-bold">阻擋原因：</div>
                                <ul className="list-disc list-inside">
                                  {qual.reasons.map((r, i) => (
                                    <li key={i}>{r}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {qual.warnings.length > 0 && (
                              <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                提醒：{qual.warnings.join('；')}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {isAssignable ? (
                            <>
                              <button
                                onClick={() => handleAssignCrew(crew.id, false)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-xs"
                              >
                                正班指派
                              </button>
                              <button
                                onClick={() => handleAssignCrew(crew.id, true)}
                                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-xs transition-colors shadow-xs"
                                title="標記為代班 (自動計算代班津貼)"
                              >
                                代班指派
                              </button>
                            </>
                          ) : (
                            <span className="px-2.5 py-1 text-[11px] text-slate-400 bg-slate-100 rounded-lg font-medium border border-slate-200">
                              不可指派
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                onClick={() => setManualModalEntry(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Trip-by-Trip Granular Dispatch Modal */}
      {isTripModalOpen && (
        <DailyTripDispatchModal
          isOpen={isTripModalOpen}
          initialDate={tripModalDate}
          initialVesselId={tripModalVesselId}
          selectedMonth={selectedMonth}
          vessels={vessels}
          crewList={crewList}
          leaveRequests={leaveRequests}
          schedules={schedules}
          userRole={userRole}
          onClose={() => setIsTripModalOpen(false)}
          onSaveTripAssignments={handleSaveTripAssignments}
        />
      )}
    </div>
  );
};
