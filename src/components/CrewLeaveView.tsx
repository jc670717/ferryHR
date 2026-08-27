import React, { useState } from 'react';
import { 
  CalendarCheck, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Check, 
  X, 
  Sparkles, 
  Flame, 
  User, 
  ShieldCheck,
  Send,
  HelpCircle
} from 'lucide-react';
import { CrewMember, LeaveRequest, ScheduleEntry, Vessel, UserRole } from '../types';
import { analyzeAvailableLeaveDates } from '../services/schedulingEngine';

interface CrewLeaveViewProps {
  currentCrew?: CrewMember;
  allCrew: CrewMember[];
  schedules: ScheduleEntry[];
  vessels: Vessel[];
  leaveRequests: LeaveRequest[];
  selectedMonth: string;
  userRole: UserRole;
  onRequestLeave: (request: Partial<LeaveRequest>) => void;
  onReviewLeave: (requestId: string, status: 'APPROVED' | 'REJECTED', comment?: string) => void;
  onForceAssignLeave?: (crewId: string, date: string) => void;
}

export const CrewLeaveView: React.FC<CrewLeaveViewProps> = ({
  currentCrew,
  allCrew,
  schedules,
  vessels,
  leaveRequests,
  selectedMonth,
  userRole,
  onRequestLeave,
  onReviewLeave,
  onForceAssignLeave,
}) => {
  const [selectedDateForApply, setSelectedDateForApply] = useState<string | null>(null);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveType, setLeaveType] = useState<import('../types').LeaveType>('MONTHLY_REST');
  const [reviewComment, setReviewComment] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // 預設船員 (若當前使用者為管理人員，可切換模擬任一本國籍船員)
  const [activeCrewId, setActiveCrewId] = useState<string>(currentCrew?.id || 'C-TW-01');
  const activeCrew = allCrew.find(c => c.id === activeCrewId) || allCrew[0];

  const twCrewList = allCrew.filter(c => c.nationality === 'TW');

  // 計算該船員在該月份的可休日期分析
  const availableDateAnalysis = activeCrew
    ? analyzeAvailableLeaveDates(activeCrew, selectedMonth, schedules, vessels, allCrew, leaveRequests)
    : [];

  const pendingRequests = leaveRequests.filter(l => l.status === 'PENDING');
  const reviewedRequests = leaveRequests.filter(l => l.status !== 'PENDING');

  // 提交休假申請 (先選先得)
  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateForApply || !activeCrew) return;

    onRequestLeave({
      crewId: activeCrew.id,
      date: selectedDateForApply,
      type: leaveType,
      reason: leaveReason || '個人輪休排定',
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    });

    setSelectedDateForApply(null);
    setLeaveReason('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <CalendarCheck className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-800">
                本國籍船員休假／餘假管理與線上搶選系統
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              系統依船舶安全配置與代理職能自動分析「可休日期」，採「先選先得」預約機制，經船務審核後寫入正式班表。
            </p>
          </div>

          {/* If manager, allow switching crew simulation */}
          {userRole !== 'CREW' && (
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-600">檢視船員：</span>
              <select
                value={activeCrewId}
                onChange={(e) => setActiveCrewId(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                {twCrewList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.role} / {c.rankLevel})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Quota Dashboard Cards */}
        {activeCrew && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
              <div className="text-xs text-blue-700 font-medium">當月應休天數</div>
              <div className="text-2xl font-black text-blue-900 mt-1">
                {activeCrew.standardMonthlyRestDays} <span className="text-xs font-normal">天</span>
              </div>
              <div className="text-[10px] text-blue-600 mt-0.5">法定月休標準 (每月8天)</div>
            </div>

            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <div className="text-xs text-emerald-700 font-medium">當月已核准休假</div>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                {leaveRequests.filter(l => l.crewId === activeCrew.id && l.date.startsWith(selectedMonth) && l.status === 'APPROVED').length}
                <span className="text-xs font-normal"> 天</span>
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">已寫入正式排班</div>
            </div>

            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl">
              <div className="text-xs text-indigo-700 font-medium">剩餘可休天數 (餘假)</div>
              <div className="text-2xl font-black text-indigo-900 mt-1">
                {Math.max(0, activeCrew.standardMonthlyRestDays - leaveRequests.filter(l => l.crewId === activeCrew.id && l.date.startsWith(selectedMonth) && l.status === 'APPROVED').length)}
                <span className="text-xs font-normal"> 天</span>
              </div>
              <div className="text-[10px] text-indigo-600 mt-0.5">本月尚可登記搶選</div>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
              <div className="text-xs text-amber-700 font-medium">年度特休／補休累積</div>
              <div className="text-2xl font-black text-amber-900 mt-1">
                {activeCrew.annualLeaveTotal - activeCrew.annualLeaveTaken} <span className="text-xs font-normal">天</span>
              </div>
              <div className="text-[10px] text-amber-600 mt-0.5">總額 {activeCrew.annualLeaveTotal} 天 / 已用 {activeCrew.annualLeaveTaken} 天</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Smart Available Dates & First-Come-First-Served Selection Calendar (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  【{activeCrew?.name}】智慧分析可休日期線上預選 (先選先得)
                </h3>
                <span className="text-xs text-slate-500">
                  綠色日期代表該日安全配置具備代理備勤彈性，可直接點擊預約休假
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" /> 可休名額
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-slate-300" /> 名額已滿/不可休
                </span>
              </div>
            </div>

            {/* Date Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 mt-4">
              {availableDateAnalysis.map((item) => {
                const dayNum = item.date.split('-')[2];
                const isSelected = selectedDateForApply === item.date;

                return (
                  <button
                    key={item.date}
                    disabled={!item.isAvailable}
                    onClick={() => setSelectedDateForApply(item.date)}
                    className={`p-2.5 rounded-xl text-left border transition-all relative ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400/30 shadow-md transform scale-[1.02]'
                        : item.isAvailable
                        ? 'bg-emerald-50/70 border-emerald-300 hover:bg-emerald-100 text-emerald-950 cursor-pointer shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-medium ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {item.dayOfWeek}
                      </span>
                      <span className="font-mono font-bold text-sm">{dayNum}</span>
                    </div>

                    <div className="mt-1.5">
                      {item.isAvailable ? (
                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-center ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-900'
                        }`}>
                          剩 {item.remainingSlots} 名額
                        </div>
                      ) : (
                        <div className="text-[10px] text-center text-slate-400 py-0.5">
                          額滿/在航
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selection Form Drawer if date selected */}
            {selectedDateForApply && (
              <form onSubmit={handleSubmitLeave} className="mt-5 p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-blue-950 flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-600" />
                    已選擇日期：{selectedDateForApply} 休假申請
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDateForApply(null)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    取消選擇
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">休假假別</label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value as any)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                    >
                      <option value="MONTHLY_REST">當月例行輪休 (扣抵當月應休)</option>
                      <option value="ANNUAL">特別休假 (扣抵年度特休)</option>
                      <option value="COMPENSATORY">補休假 (超額執勤補休)</option>
                      <option value="SPECIAL">特別公假 / 事假</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">申請事由 (選填)</label>
                    <input
                      type="text"
                      placeholder="例：返台探親、個人休閒、家庭聚會"
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-blue-800">
                    * 採先選先得順位，送出後將由船務管理員進行最後審核並更新正式班表
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm"
                  >
                    確認送出休假預約申請
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right: Leave Approvals & Application Queue (1 Col) */}
        <div className="space-y-4">
          {/* Pending Approval Queue */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                待審核休假申請 ({pendingRequests.length})
              </h3>
              <span className="text-[11px] text-slate-500">先選先得順位</span>
            </div>

            <div className="space-y-2.5 mt-3 max-h-96 overflow-y-auto pr-1">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  目前無待審核之休假申請
                </div>
              ) : (
                pendingRequests.map((req, idx) => {
                  const applicant = allCrew.find(c => c.id === req.crewId);

                  return (
                    <div key={req.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[10px] font-mono">
                            #{idx + 1}
                          </span>
                          <span>{applicant?.name}</span>
                          <span className="text-slate-500 font-normal">({applicant?.role})</span>
                        </div>
                        <span className="font-mono font-bold text-indigo-600">{req.date}</span>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        申請時間：<span className="font-mono">{new Date(req.requestedAt).toLocaleString()}</span>
                      </div>
                      {req.reason && (
                        <div className="text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-200">
                          事由：{req.reason}
                        </div>
                      )}

                      {/* Approval Actions for Managers */}
                      {userRole !== 'CREW' ? (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                          <span className="text-[10px] text-amber-700 font-medium">
                            待船務主管核准 (核准後寫入正式排班)
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onReviewLeave(req.id, 'REJECTED', '營運人力調度受限')}
                              className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded text-xs font-semibold"
                            >
                              駁回
                            </button>
                            <button
                              onClick={() => onReviewLeave(req.id, 'APPROVED', '准予休假')}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs"
                            >
                              核准休假
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-amber-600 font-medium bg-amber-50/70 p-1.5 rounded border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          已排入先選先得審核隊列，待船務調度主管審查核准
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Reviewed History */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-bold text-sm text-slate-800 pb-2 border-b border-slate-100">
              近期已審核紀錄
            </h3>
            <div className="space-y-2 mt-3 max-h-60 overflow-y-auto text-xs">
              {reviewedRequests.slice(0, 5).map((req) => {
                const applicant = allCrew.find(c => c.id === req.crewId);
                const isApproved = req.status === 'APPROVED';

                return (
                  <div key={req.id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-800">
                        {applicant?.name} ‧ <span className="font-mono">{req.date}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{req.reviewComment || '無備註'}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {isApproved ? '已核准' : '已駁回'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
