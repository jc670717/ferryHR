import React, { useState, useMemo } from 'react';
import { 
  Compass, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Ship, 
  Users, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Layers, 
  Info,
  Timer,
  Navigation,
  ArrowRight,
  TrendingUp,
  Flame,
  Check
} from 'lucide-react';
import { 
  FerryTrip, 
  Route, 
  Vessel, 
  CrewMember, 
  ScheduleEntry, 
  ComplianceValidation, 
  UserRole 
} from '../types';
import { INITIAL_FERRY_TRIPS } from '../data/initialData';
import { TAIWAN_MARITIME_LABOR_RULES } from '../services/schedulingEngine';

interface MatsuFerryScheduleViewProps {
  routes: Route[];
  vessels: Vessel[];
  crewList: CrewMember[];
  schedules: ScheduleEntry[];
  compliance: ComplianceValidation;
  selectedMonth: string;
  userRole: UserRole;
  onNavigateToSchedule: () => void;
}

export const MatsuFerryScheduleView: React.FC<MatsuFerryScheduleViewProps> = ({
  routes,
  vessels,
  crewList,
  schedules,
  compliance,
  selectedMonth,
  userRole,
  onNavigateToSchedule,
}) => {
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('ALL');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('ALL');
  const [activeSimulationCrewId, setActiveSimulationCrewId] = useState<string>(crewList[0]?.id || 'C-TW-01');
  const [simulatedTrips, setSimulatedTrips] = useState<string[]>(['TRIP-NB-01', 'TRIP-NB-02', 'TRIP-NB-03']);

  // Filtered ferry trips
  const filteredTrips = useMemo(() => {
    return INITIAL_FERRY_TRIPS.filter(trip => {
      if (selectedRouteFilter !== 'ALL' && trip.routeId !== selectedRouteFilter) return false;
      if (selectedShiftFilter !== 'ALL' && trip.shiftGroup !== selectedShiftFilter) return false;
      return true;
    });
  }, [selectedRouteFilter, selectedShiftFilter]);

  // Selected simulation crew
  const simCrew = useMemo(() => {
    return crewList.find(c => c.id === activeSimulationCrewId) || crewList[0];
  }, [crewList, activeSimulationCrewId]);

  // Calculate simulated duty hours
  const simulationResult = useMemo(() => {
    const chosenTrips = INITIAL_FERRY_TRIPS.filter(t => simulatedTrips.includes(t.id));
    if (chosenTrips.length === 0) {
      return {
        totalDutyHours: 0,
        normalHours: 0,
        overtimeHours: 0,
        restHours24h: 24,
        isOverDaily12h: false,
        isRestViolated: false,
        isNormalOvertime: false,
        warningCount: 0,
        status: 'LEGAL',
      };
    }

    // Calculate sum of trip duty hours
    let netWorkHours = chosenTrips.reduce((acc, t) => acc + (t.totalDutyHours || 1.5), 0);
    const totalDutyHours = Math.round(netWorkHours * 10) / 10;
    const normalHours = Math.min(TAIWAN_MARITIME_LABOR_RULES.STANDARD_DAILY_HOURS, totalDutyHours);
    const overtimeHours = Math.max(0, totalDutyHours - TAIWAN_MARITIME_LABOR_RULES.STANDARD_DAILY_HOURS);
    const restHours24h = Math.max(0, 24 - totalDutyHours);

    const isOverDaily12h = totalDutyHours > TAIWAN_MARITIME_LABOR_RULES.MAX_DAILY_HOURS;
    const isRestViolated = restHours24h < TAIWAN_MARITIME_LABOR_RULES.MIN_DAILY_REST_HOURS;
    const isNormalOvertime = totalDutyHours > TAIWAN_MARITIME_LABOR_RULES.STANDARD_DAILY_HOURS && !isOverDaily12h;

    let status: 'LEGAL' | 'WARNING' | 'VIOLATION' = 'LEGAL';
    if (isOverDaily12h || isRestViolated) {
      status = 'VIOLATION';
    } else if (isNormalOvertime) {
      status = 'WARNING';
    }

    return {
      totalDutyHours,
      normalHours,
      overtimeHours,
      restHours24h,
      isOverDaily12h,
      isRestViolated,
      isNormalOvertime,
      chosenTrips,
      status,
    };
  }, [simulatedTrips]);

  // Count trips by route
  const tripsCountByRoute = useMemo(() => {
    const counts: Record<string, number> = {};
    INITIAL_FERRY_TRIPS.forEach(t => {
      counts[t.routeId] = (counts[t.routeId] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Compass className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-800">
                馬祖海上交通班表 ＆ 台灣船員法規工時防呆中樞
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              整合「馬祖海上交通訂位購票系統 (matsuebs.com)」真實航線時刻表，嚴格落實台灣《船員法》與《勞基法》工時防呆，嚴禁超時疲勞航行。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://www.matsuebs.com/home/SelectShip#reset"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
            >
              <span>參考馬祖購票班表官方來源</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>

            <button
              onClick={onNavigateToSchedule}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              前往智慧排班看板
            </button>
          </div>
        </div>

        {/* Real-time Law Standards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-900">單日最高工時 (含加班)</span>
              <span className="px-1.5 py-0.5 bg-blue-200/80 text-blue-900 font-mono text-[10px] font-bold rounded">
                ≤ 12 小時
              </span>
            </div>
            <div className="text-[11px] text-blue-800">
              正常工時 8h，單日延長工時上限 4h。超過 12h 嚴格列為違法。
            </div>
            <div className="text-[9px] text-blue-600/80 font-mono">
              依據：船員法第29、30條 / 勞基法第32條
            </div>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-900">24小時最低休息時間</span>
              <span className="px-1.5 py-0.5 bg-emerald-200/80 text-emerald-900 font-mono text-[10px] font-bold rounded">
                ≥ 10 小時
              </span>
            </div>
            <div className="text-[11px] text-emerald-800">
              防疲勞管制：任一24h內休息≥10h，主休息時段≥6h連續。
            </div>
            <div className="text-[9px] text-emerald-600/80 font-mono">
              依據：船員法第31條 / STCW A-VIII/1
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900">連續工作天數上限</span>
              <span className="px-1.5 py-0.5 bg-amber-200/80 text-amber-900 font-mono text-[10px] font-bold rounded">
                ≤ 6 天
              </span>
            </div>
            <div className="text-[11px] text-amber-800">
              每7日應有1日例假，嚴禁連續出勤超過6日，第7天強制輪休。
            </div>
            <div className="text-[9px] text-amber-600/80 font-mono">
              依據：船員法第37條 / 勞基法第36條
            </div>
          </div>

          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-900">月延長工時總量上限</span>
              <span className="px-1.5 py-0.5 bg-purple-200/80 text-purple-900 font-mono text-[10px] font-bold rounded">
                ≤ 46 小時
              </span>
            </div>
            <div className="text-[11px] text-purple-800">
              一個月內加班總時數不得逾46h，由系統即時累計監控。
            </div>
            <div className="text-[9px] text-purple-600/80 font-mono">
              依據：勞動基準法第32條第2項
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Anti-Overwork Shift Simulator */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-base text-slate-800">
              馬祖航線多班次輪值 ＆ 單日工時防疲勞試算器
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            測試一日多班（如南竿-北竿22班/南竿-莒光）之梯次輪調合規性
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Select Crew and Preset Schemes */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                選擇模擬船員：
              </label>
              <select
                value={activeSimulationCrewId}
                onChange={(e) => setActiveSimulationCrewId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {crewList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.role} ‧ {c.rankLevel}) - {c.nationality === 'TW' ? '本國籍' : '外籍固定'}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Shift Preset Buttons */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">快速載入排班情境方案：</span>
              
              <button
                onClick={() => {
                  setSimulatedTrips(['TRIP-NB-01', 'TRIP-NB-02', 'TRIP-NB-03', 'TRIP-NB-04', 'TRIP-NB-05', 'TRIP-NB-06']);
                }}
                className="w-full p-2.5 text-left border rounded-lg text-xs transition-all hover:bg-emerald-50/50 border-emerald-300 bg-emerald-50/30"
              >
                <div className="font-bold text-emerald-900 flex items-center justify-between">
                  <span>方案一：南北竿 早班梯次 (Shift A)</span>
                  <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-800 text-[10px] rounded font-bold">完美合規</span>
                </div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  執航 07:00 ~ 12:00 (前6班)，工時 6.0h，符合正常工時不疲勞
                </div>
              </button>

              <button
                onClick={() => {
                  setSimulatedTrips(['TRIP-NB-07', 'TRIP-NB-08', 'TRIP-NB-09', 'TRIP-NB-10', 'TRIP-NB-11']);
                }}
                className="w-full p-2.5 text-left border rounded-lg text-xs transition-all hover:bg-blue-50/50 border-blue-300 bg-blue-50/30"
              >
                <div className="font-bold text-blue-900 flex items-center justify-between">
                  <span>方案二：南北竿 午班梯次 (Shift B)</span>
                  <span className="px-1.5 py-0.5 bg-blue-200 text-blue-800 text-[10px] rounded font-bold">完美合規</span>
                </div>
                <div className="text-[11px] text-blue-700 mt-1">
                  執航 13:00 ~ 17:50 (後5班)，工時 6.0h，早午兩班交接無縫接軌
                </div>
              </button>

              <button
                onClick={() => {
                  setSimulatedTrips(['TRIP-JG-01', 'TRIP-JG-02', 'TRIP-JG-03']);
                }}
                className="w-full p-2.5 text-left border rounded-lg text-xs transition-all hover:bg-indigo-50/50 border-indigo-300 bg-indigo-50/30"
              >
                <div className="font-bold text-indigo-900 flex items-center justify-between">
                  <span>方案三：南竿-莒光 巡航日全班 (3趟固定航班)</span>
                  <span className="px-1.5 py-0.5 bg-indigo-200 text-indigo-800 text-[10px] rounded font-bold">合規 (7.5h)</span>
                </div>
                <div className="text-[11px] text-indigo-700 mt-1">
                  07:00、11:00、14:30 班次，航段中間留有整備與休息
                </div>
              </button>

              <button
                onClick={() => {
                  // Violating scenario: 11 straight trips from 07:00 to 17:50
                  setSimulatedTrips([
                    'TRIP-NB-01', 'TRIP-NB-02', 'TRIP-NB-03', 'TRIP-NB-04', 'TRIP-NB-05', 
                    'TRIP-NB-06', 'TRIP-NB-07', 'TRIP-NB-08', 'TRIP-NB-09', 'TRIP-NB-10', 'TRIP-NB-11'
                  ]);
                }}
                className="w-full p-2.5 text-left border rounded-lg text-xs transition-all hover:bg-rose-50/50 border-rose-300 bg-rose-50/30"
              >
                <div className="font-bold text-rose-900 flex items-center justify-between">
                  <span>情境四：違規示範 (一人連續開滿整天11班)</span>
                  <span className="px-1.5 py-0.5 bg-rose-200 text-rose-800 text-[10px] rounded font-bold">嚴重違法警告</span>
                </div>
                <div className="text-[11px] text-rose-700 mt-1">
                  07:00 連開至 17:50 (工時高達 13.5h)，觸發超時與休息不足雙重違法！
                </div>
              </button>
            </div>
          </div>

          {/* Middle: Selected Trips Checklist */}
          <div className="space-y-2 lg:col-span-1">
            <span className="text-xs font-bold text-slate-700 block">
              勾選當日指派之馬祖航線班次 ({simulatedTrips.length} 班次)：
            </span>
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
              {INITIAL_FERRY_TRIPS.slice(0, 16).map((trip) => {
                const isSelected = simulatedTrips.includes(trip.id);
                return (
                  <label
                    key={trip.id}
                    className={`flex items-center justify-between p-2 rounded-md text-xs cursor-pointer border transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSimulatedTrips(prev => [...prev, trip.id]);
                          } else {
                            setSimulatedTrips(prev => prev.filter(id => id !== trip.id));
                          }
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-mono text-[11px] font-bold">{trip.tripCode} ({trip.departureTime} ~ {trip.arrivalTime})</div>
                        <div className="text-[10px] text-slate-500">{trip.departurePort} ➔ {trip.arrivalPort} ({Math.round(trip.voyageDurationHours * 60)}分)</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-slate-500">
                      +{trip.totalDutyHours}h
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Right: Real-time Compliance Verdict Card */}
          <div className={`p-5 rounded-xl border flex flex-col justify-between ${
            simulationResult.status === 'VIOLATION'
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : simulationResult.status === 'WARNING'
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-black/10">
                <span className="text-xs font-bold uppercase tracking-wider">防疲勞合規檢測結果</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  simulationResult.status === 'VIOLATION'
                    ? 'bg-rose-600 text-white'
                    : simulationResult.status === 'WARNING'
                    ? 'bg-amber-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {simulationResult.status === 'VIOLATION' ? '嚴格違法 ‧ 禁止出航' : simulationResult.status === 'WARNING' ? '合規 ‧ 需核發加班費' : '100% 依法合規'}
                </span>
              </div>

              {/* Stats metric */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-white/80 p-2.5 rounded-lg border border-black/5">
                  <div className="text-[10px] text-slate-500">當日排定總工時</div>
                  <div className={`text-xl font-bold font-mono ${simulationResult.totalDutyHours > 12 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                    {simulationResult.totalDutyHours} <span className="text-xs font-normal">小時</span>
                  </div>
                  <div className="text-[9px] text-slate-400">法定上限 12h</div>
                </div>

                <div className="bg-white/80 p-2.5 rounded-lg border border-black/5">
                  <div className="text-[10px] text-slate-500">24h防疲勞休息</div>
                  <div className={`text-xl font-bold font-mono ${simulationResult.restHours24h < 10 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                    {simulationResult.restHours24h} <span className="text-xs font-normal">小時</span>
                  </div>
                  <div className="text-[9px] text-slate-400">法定最低 10h</div>
                </div>
              </div>

              {/* Rule Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  {simulationResult.totalDutyHours <= 12 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>單日總工時 ≤ 12 小時基準：{simulationResult.totalDutyHours <= 12 ? '通過' : '違規超時！'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {simulationResult.restHours24h >= 10 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>24小時連續休息 ≥ 10 小時：{simulationResult.restHours24h >= 10 ? '通過' : '休息不足！'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>正常工時：{simulationResult.normalHours}h ‧ 延長加班：{simulationResult.overtimeHours}h</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-black/10 text-[11px] text-slate-600 font-medium">
              💡 建議調度：高頻率穿梭航線請採取<strong className="text-blue-700">「早午梯次輪班制 (Shift A/B)」</strong>，避免單一船員跨時段連續執勤。
            </div>
          </div>
        </div>
      </div>

      {/* Ferry Trips Schedule Matrix */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Ship className="w-4 h-4 text-blue-600" />
              馬祖各航線標準班次時刻清冊 (共 {INITIAL_FERRY_TRIPS.length} 班次)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              依據連江縣港務處及馬祖海上交通即時班表設定，支援梯次輪派與工時追蹤
            </p>
          </div>

          {/* Route and Shift Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedRouteFilter}
              onChange={(e) => setSelectedRouteFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="ALL">全部航線 ({INITIAL_FERRY_TRIPS.length})</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({tripsCountByRoute[r.id] || 0}班)
                </option>
              ))}
            </select>

            <select
              value={selectedShiftFilter}
              onChange={(e) => setSelectedShiftFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="ALL">全部梯次類型</option>
              <option value="MORNING">早班梯次 (MORNING)</option>
              <option value="AFTERNOON">午班梯次 (AFTERNOON)</option>
              <option value="FULL_DAY">全日值航梯次 (FULL_DAY)</option>
              <option value="NIGHT">長程夜航梯次 (NIGHT)</option>
            </select>
          </div>
        </div>

        {/* Trips Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 text-slate-800 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">航次代碼</th>
                <th className="py-3 px-4">航線區段</th>
                <th className="py-3 px-4">開航時間</th>
                <th className="py-3 px-4">預計抵達</th>
                <th className="py-3 px-4">航程時間</th>
                <th className="py-3 px-4">計值工時</th>
                <th className="py-3 px-4">輪值梯次</th>
                <th className="py-3 px-4">預設執航船舶</th>
                <th className="py-3 px-4">備註特徵</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTrips.map((trip) => {
                const route = routes.find(r => r.id === trip.routeId);
                const vessel = vessels.find(v => v.id === trip.defaultVesselId);

                return (
                  <tr key={trip.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {trip.tripCode}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{route?.name || trip.routeId}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{trip.departurePort}</span>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span>{trip.arrivalPort}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {trip.departureTime}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {trip.arrivalTime}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]">
                        {Math.round(trip.voyageDurationHours * 60)} 分鐘
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {trip.totalDutyHours} 小時
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        trip.shiftGroup === 'MORNING'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : trip.shiftGroup === 'AFTERNOON'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : trip.shiftGroup === 'NIGHT'
                          ? 'bg-purple-100 text-purple-900 border border-purple-200'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}>
                        {trip.shiftGroup === 'MORNING' ? '早班 MORNING' :
                         trip.shiftGroup === 'AFTERNOON' ? '午班 AFTERNOON' :
                         trip.shiftGroup === 'NIGHT' ? '夜航班 NIGHT' : '全日航次 FULL_DAY'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Ship className="w-3.5 h-3.5 text-slate-400" />
                        <span>{vessel?.name || trip.defaultVesselId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {trip.note || '-'}
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
