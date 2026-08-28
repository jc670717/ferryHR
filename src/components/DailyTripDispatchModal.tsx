import React, { useState, useMemo, useEffect } from 'react';
import { 
  Compass, 
  Calendar as CalendarIcon, 
  Clock, 
  Ship, 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  UserCheck, 
  UserX, 
  Copy, 
  Zap, 
  Flame, 
  HelpCircle,
  Save,
  RotateCcw
} from 'lucide-react';
import { 
  Vessel, 
  CrewMember, 
  ScheduleEntry, 
  LeaveRequest, 
  CrewRole, 
  FerryTrip, 
  UserRole,
  ShiftType
} from '../types';
import { INITIAL_FERRY_TRIPS, INITIAL_ROUTES } from '../data/initialData';
import { checkCrewQualification, TAIWAN_MARITIME_LABOR_RULES } from '../services/schedulingEngine';

interface RoleSlot {
  role: CrewRole;
  index: number;
  crewId: string;
  isCover: boolean;
  coverForCrewId?: string;
}

interface TripAssignmentState {
  tripId: string;
  vesselId: string;
  slots: RoleSlot[];
}

interface DailyTripDispatchModalProps {
  isOpen: boolean;
  initialDate: string;
  initialVesselId?: string;
  selectedMonth: string;
  vessels: Vessel[];
  crewList: CrewMember[];
  leaveRequests: LeaveRequest[];
  schedules: ScheduleEntry[];
  userRole: UserRole;
  onClose: () => void;
  onSaveTripAssignments: (date: string, newEntries: ScheduleEntry[]) => void;
}

export const DailyTripDispatchModal: React.FC<DailyTripDispatchModalProps> = ({
  isOpen,
  initialDate,
  initialVesselId,
  selectedMonth,
  vessels,
  crewList,
  leaveRequests,
  schedules,
  userRole,
  onClose,
  onSaveTripAssignments,
}) => {
  const [currentDate, setCurrentDate] = useState<string>(initialDate || `${selectedMonth}-01`);
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('ALL');
  const [selectedVesselFilter, setSelectedVesselFilter] = useState<string>(initialVesselId || 'ALL');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('ALL');

  // Quick preset crew groups for batch assignment
  const [batchMorningCaptain, setBatchMorningCaptain] = useState<string>('');
  const [batchMorningEngineer, setBatchMorningEngineer] = useState<string>('');
  const [batchMorningDeckhand, setBatchMorningDeckhand] = useState<string>('');

  const [batchAfternoonCaptain, setBatchAfternoonCaptain] = useState<string>('');
  const [batchAfternoonEngineer, setBatchAfternoonEngineer] = useState<string>('');
  const [batchAfternoonDeckhand, setBatchAfternoonDeckhand] = useState<string>('');

  // Per-trip assignment state: Map of tripId -> TripAssignmentState
  const [assignments, setAssignments] = useState<Record<string, TripAssignmentState>>({});
  const [showBatchTools, setShowBatchTools] = useState<boolean>(false);
  const [isSavedNotice, setIsSavedNotice] = useState<boolean>(false);

  // Helper map for fast lookups
  const vesselMap = useMemo(() => new Map(vessels.map(v => [v.id, v])), [vessels]);
  const crewMap = useMemo(() => new Map(crewList.map(c => [c.id, c])), [crewList]);
  const tripMap = useMemo(() => new Map(INITIAL_FERRY_TRIPS.map(t => [t.id, t])), []);

  // Initialize assignments when modal opens or date changes
  useEffect(() => {
    if (!isOpen) return;

    // Get current active schedules on currentDate
    const activeDaySchedules = schedules.filter(
      s => s.date === currentDate && s.status !== 'CANCELLED'
    );

    const initialMap: Record<string, TripAssignmentState> = {};

    INITIAL_FERRY_TRIPS.forEach(trip => {
      const targetVesselId = trip.defaultVesselId || vessels[0]?.id || 'V1';
      const vessel = vesselMap.get(targetVesselId);
      const requirements = vessel?.safetyRequirements || [
        { id: 'R-C', role: 'CAPTAIN' as CrewRole, minCount: 1, requiredCertRanks: [] },
        { id: 'R-E', role: 'CHIEF_ENGINEER' as CrewRole, minCount: 1, requiredCertRanks: [] },
        { id: 'R-D', role: 'DECKHAND' as CrewRole, minCount: 2, requiredCertRanks: [] },
      ];

      // Build slots
      const slots: RoleSlot[] = [];
      requirements.forEach(req => {
        for (let i = 0; i < req.minCount; i++) {
          // Check if there is an existing schedule that covers this trip
          // 1. Explicit tripIds match
          const explicitMatch = activeDaySchedules.find(
            s => s.vesselId === targetVesselId && 
                 s.role === req.role && 
                 s.tripIds && s.tripIds.includes(trip.id)
          );

          // 2. Or whole-day / shift match on this vessel
          const vesselMatch = activeDaySchedules.filter(
            s => s.vesselId === targetVesselId && s.role === req.role
          );

          let assignedCrewId = '';
          let isCover = false;
          let coverForCrewId: string | undefined = undefined;

          if (explicitMatch) {
            assignedCrewId = explicitMatch.crewId;
            isCover = explicitMatch.isCover;
            coverForCrewId = explicitMatch.coverForCrewId;
          } else if (vesselMatch.length > i && (!vesselMatch[i].tripIds || vesselMatch[i].tripIds?.length === 0)) {
            // If whole-vessel assignment without tripIds specified
            // Match morning/afternoon shift appropriately
            const matchEntry = vesselMatch[i];
            if (trip.shiftGroup === 'MORNING' && matchEntry.shift === 'SHIFT_B_AFTERNOON') {
              // skip
            } else if (trip.shiftGroup === 'AFTERNOON' && matchEntry.shift === 'SHIFT_A_MORNING') {
              // skip
            } else {
              assignedCrewId = matchEntry.crewId;
              isCover = matchEntry.isCover;
              coverForCrewId = matchEntry.coverForCrewId;
            }
          }

          slots.push({
            role: req.role,
            index: i,
            crewId: assignedCrewId,
            isCover,
            coverForCrewId,
          });
        }
      });

      initialMap[trip.id] = {
        tripId: trip.id,
        vesselId: targetVesselId,
        slots,
      };
    });

    setAssignments(initialMap);
  }, [isOpen, currentDate, schedules, vesselMap, vessels]);

  // Set default batch dropdown values from active crew
  useEffect(() => {
    const captains = crewList.filter(c => c.role === 'CAPTAIN' && c.status === 'ACTIVE');
    const engineers = crewList.filter(c => c.role === 'CHIEF_ENGINEER' && c.status === 'ACTIVE');
    const deckhands = crewList.filter(c => (c.role === 'DECKHAND' || c.role === 'CHIEF_MATE') && c.status === 'ACTIVE');

    if (captains.length > 0) setBatchMorningCaptain(captains[0].id);
    if (captains.length > 1) setBatchAfternoonCaptain(captains[1].id);
    if (engineers.length > 0) setBatchMorningEngineer(engineers[0].id);
    if (engineers.length > 1) setBatchAfternoonEngineer(engineers[1].id);
    if (deckhands.length > 0) setBatchMorningDeckhand(deckhands[0].id);
    if (deckhands.length > 1) setBatchAfternoonDeckhand(deckhands[1].id);
  }, [crewList]);

  // Date Navigation
  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  // Filtered trips to display
  const displayTrips = useMemo(() => {
    return INITIAL_FERRY_TRIPS.filter(trip => {
      if (selectedRouteFilter !== 'ALL' && trip.routeId !== selectedRouteFilter) return false;
      if (selectedVesselFilter !== 'ALL' && trip.defaultVesselId !== selectedVesselFilter) return false;
      if (selectedShiftFilter !== 'ALL' && trip.shiftGroup !== selectedShiftFilter) return false;
      return true;
    });
  }, [selectedRouteFilter, selectedVesselFilter, selectedShiftFilter]);

  // Handle single slot crew change
  const handleSlotCrewChange = (tripId: string, role: CrewRole, index: number, newCrewId: string) => {
    setAssignments(prev => {
      const current = prev[tripId];
      if (!current) return prev;

      const newSlots = current.slots.map(s => {
        if (s.role === role && s.index === index) {
          return { ...s, crewId: newCrewId };
        }
        return s;
      });

      return {
        ...prev,
        [tripId]: {
          ...current,
          slots: newSlots,
        },
      };
    });
  };

  // Handle cover toggle
  const handleSlotCoverToggle = (tripId: string, role: CrewRole, index: number, isCover: boolean) => {
    setAssignments(prev => {
      const current = prev[tripId];
      if (!current) return prev;

      const newSlots = current.slots.map(s => {
        if (s.role === role && s.index === index) {
          return { ...s, isCover };
        }
        return s;
      });

      return {
        ...prev,
        [tripId]: {
          ...current,
          slots: newSlots,
        },
      };
    });
  };

  // Apply Batch Morning Shift (Shift A)
  const handleApplyBatchMorning = () => {
    setAssignments(prev => {
      const next = { ...prev };
      INITIAL_FERRY_TRIPS.filter(t => t.shiftGroup === 'MORNING').forEach(trip => {
        const current = next[trip.id];
        if (!current) return;

        const newSlots = current.slots.map(s => {
          if (s.role === 'CAPTAIN' && batchMorningCaptain) return { ...s, crewId: batchMorningCaptain };
          if (s.role === 'CHIEF_ENGINEER' && batchMorningEngineer) return { ...s, crewId: batchMorningEngineer };
          if (s.role === 'DECKHAND' && batchMorningDeckhand && s.index === 0) return { ...s, crewId: batchMorningDeckhand };
          return s;
        });

        next[trip.id] = { ...current, slots: newSlots };
      });
      return next;
    });
  };

  // Apply Batch Afternoon Shift (Shift B)
  const handleApplyBatchAfternoon = () => {
    setAssignments(prev => {
      const next = { ...prev };
      INITIAL_FERRY_TRIPS.filter(t => t.shiftGroup === 'AFTERNOON').forEach(trip => {
        const current = next[trip.id];
        if (!current) return;

        const newSlots = current.slots.map(s => {
          if (s.role === 'CAPTAIN' && batchAfternoonCaptain) return { ...s, crewId: batchAfternoonCaptain };
          if (s.role === 'CHIEF_ENGINEER' && batchAfternoonEngineer) return { ...s, crewId: batchAfternoonEngineer };
          if (s.role === 'DECKHAND' && batchAfternoonDeckhand && s.index === 0) return { ...s, crewId: batchAfternoonDeckhand };
          return s;
        });

        next[trip.id] = { ...current, slots: newSlots };
      });
      return next;
    });
  };

  // Auto-fill Foreign Fixed Crew
  const handleAutoFillForeignCrew = () => {
    const fixedForeign = crewList.filter(c => c.nationality === 'FOREIGN' && c.fixedVesselId);
    setAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(tripId => {
        const trip = tripMap.get(tripId);
        if (!trip) return;
        const current = next[tripId];
        const newSlots = current.slots.map(s => {
          const matchingFixed = fixedForeign.find(
            f => f.fixedVesselId === current.vesselId && f.role === s.role
          );
          if (matchingFixed) {
            return { ...s, crewId: matchingFixed.id };
          }
          return s;
        });
        next[tripId] = { ...current, slots: newSlots };
      });
      return next;
    });
  };

  // Clear all assignments for current date
  const handleClearDayAssignments = () => {
    if (!window.confirm(`確定要清空 ${currentDate} 所有班次的船員指派嗎？`)) return;
    setAssignments(prev => {
      const next: Record<string, TripAssignmentState> = {};
      Object.keys(prev).forEach(tripId => {
        next[tripId] = {
          ...prev[tripId],
          slots: prev[tripId].slots.map(s => ({ ...s, crewId: '', isCover: false })),
        };
      });
      return next;
    });
  };

  // Calculate Real-time Crew Daily Load & Conflicts
  const crewDailyStats = useMemo(() => {
    const stats: Record<string, {
      crew: CrewMember;
      assignedTrips: FerryTrip[];
      totalHours: number;
      timeSpans: { start: string; end: string; tripCode: string }[];
      hasTimeConflict: boolean;
      isOnLeave: boolean;
      isOver12h: boolean;
      isOver8h: boolean;
    }> = {};

    const approvedLeavesToday = new Set(
      leaveRequests.filter(l => l.date === currentDate && l.status === 'APPROVED').map(l => l.crewId)
    );

    crewList.forEach(c => {
      stats[c.id] = {
        crew: c,
        assignedTrips: [],
        totalHours: 0,
        timeSpans: [],
        hasTimeConflict: false,
        isOnLeave: approvedLeavesToday.has(c.id),
        isOver12h: false,
        isOver8h: false,
      };
    });

    // Traverse all assignments
    Object.values(assignments).forEach(asgn => {
      const trip = tripMap.get(asgn.tripId);
      if (!trip) return;

      asgn.slots.forEach(slot => {
        if (!slot.crewId || !stats[slot.crewId]) return;
        const entry = stats[slot.crewId];
        entry.assignedTrips.push(trip);
        entry.totalHours += (trip.totalDutyHours || 1.5);
        entry.timeSpans.push({
          start: trip.departureTime,
          end: trip.arrivalTime,
          tripCode: trip.tripCode,
        });
      });
    });

    // Check time conflicts & hour limits
    Object.values(stats).forEach(entry => {
      entry.totalHours = Math.round(entry.totalHours * 10) / 10;
      entry.isOver12h = entry.totalHours > TAIWAN_MARITIME_LABOR_RULES.MAX_DAILY_HOURS;
      entry.isOver8h = entry.totalHours > TAIWAN_MARITIME_LABOR_RULES.STANDARD_DAILY_HOURS && !entry.isOver12h;

      // Check overlapping time spans (e.g. 07:00~07:20 overlapping with 07:00~07:50)
      if (entry.timeSpans.length > 1) {
        for (let i = 0; i < entry.timeSpans.length; i++) {
          for (let j = i + 1; j < entry.timeSpans.length; j++) {
            const s1 = entry.timeSpans[i].start;
            const e1 = entry.timeSpans[i].end;
            const s2 = entry.timeSpans[j].start;
            const e2 = entry.timeSpans[j].end;

            if ((s1 < e2) && (s2 < e1)) {
              entry.hasTimeConflict = true;
              break;
            }
          }
          if (entry.hasTimeConflict) break;
        }
      }
    });

    return stats;
  }, [assignments, crewList, currentDate, leaveRequests, tripMap]);

  // Overall validation issues count
  const dailyIssues = useMemo(() => {
    const issues: { type: 'ERROR' | 'WARNING'; message: string }[] = [];

    Object.values(crewDailyStats).forEach(st => {
      if (st.assignedTrips.length === 0) return;

      if (st.isOnLeave) {
        issues.push({
          type: 'ERROR',
          message: `【${st.crew.name}】今日已核准休假，卻被指派了 ${st.assignedTrips.length} 個班次！`,
        });
      }
      if (st.hasTimeConflict) {
        issues.push({
          type: 'ERROR',
          message: `【${st.crew.name}】被指派的航班存在【同時段重疊衝突】！`,
        });
      }
      if (st.isOver12h) {
        issues.push({
          type: 'ERROR',
          message: `【${st.crew.name}】今日累計排定工時達 ${st.totalHours} 小時，超過法定 12 小時防疲勞上限！`,
        });
      }
      if (st.isOver8h) {
        issues.push({
          type: 'WARNING',
          message: `【${st.crew.name}】今日工時達 ${st.totalHours} 小時（產生延長加班 ${(st.totalHours - 8).toFixed(1)} 小時需核發加班津貼）`,
        });
      }
    });

    return issues;
  }, [crewDailyStats]);

  // Save assignments back into parent schedule state
  const handleSaveAndApply = () => {
    const criticalErrors = dailyIssues.filter(i => i.type === 'ERROR');
    if (criticalErrors.length > 0) {
      const confirmForce = window.confirm(
        `檢測到 ${criticalErrors.length} 個嚴重排班違規：\n\n` +
        criticalErrors.map(e => `• ${e.message}`).join('\n') +
        `\n\n是否仍要強制儲存？（強烈建議先修正違規項目以符合船員法規）`
      );
      if (!confirmForce) return;
    }

    // Group assignments by (vesselId + crewId + role) to construct clean ScheduleEntry objects
    const newScheduleEntries: ScheduleEntry[] = [];
    const crewVesselMap = new Map<string, {
      vesselId: string;
      role: CrewRole;
      crewId: string;
      tripIds: string[];
      isCover: boolean;
      totalHours: number;
      minStartTime: string;
      maxEndTime: string;
      notes: string[];
    }>();

    Object.values(assignments).forEach(asgn => {
      const trip = tripMap.get(asgn.tripId);
      if (!trip) return;

      asgn.slots.forEach(slot => {
        if (!slot.crewId) return;

        const key = `${asgn.vesselId}_${slot.crewId}_${slot.role}`;
        if (!crewVesselMap.has(key)) {
          crewVesselMap.set(key, {
            vesselId: asgn.vesselId,
            role: slot.role,
            crewId: slot.crewId,
            tripIds: [],
            isCover: slot.isCover,
            totalHours: 0,
            minStartTime: trip.departureTime,
            maxEndTime: trip.arrivalTime,
            notes: [],
          });
        }

        const rec = crewVesselMap.get(key)!;
        rec.tripIds.push(trip.id);
        rec.totalHours += (trip.totalDutyHours || 1.5);
        if (slot.isCover) rec.isCover = true;
        if (trip.departureTime < rec.minStartTime) rec.minStartTime = trip.departureTime;
        if (trip.arrivalTime > rec.maxEndTime) rec.maxEndTime = trip.arrivalTime;
        rec.notes.push(trip.tripCode);
      });
    });

    // Build schedule entries
    let entryIndex = 1;
    crewVesselMap.forEach(rec => {
      const vessel = vesselMap.get(rec.vesselId);
      const crew = crewMap.get(rec.crewId);
      const shiftType: ShiftType = rec.totalHours > 8 ? 'SPECIAL_VOYAGE' : 'VOYAGE';

      newScheduleEntries.push({
        id: `SCH-TRIP-${rec.vesselId}-${currentDate}-${rec.crewId}-${entryIndex++}`,
        date: currentDate,
        vesselId: rec.vesselId,
        routeId: vessel?.routeId || 'R1',
        role: rec.role,
        crewId: rec.crewId,
        shift: shiftType,
        tripIds: rec.tripIds,
        dutyStartTime: rec.minStartTime,
        dutyEndTime: rec.maxEndTime,
        breakHours: 1.0,
        isCover: rec.isCover,
        status: 'SCHEDULED',
        plannedHours: rec.totalHours,
        actualHours: rec.totalHours,
        isFixedAssignment: crew?.nationality === 'FOREIGN',
        notes: `班次級調度 (${rec.tripIds.length} 班次: ${rec.notes.join(', ')})`,
      });
    });

    onSaveTripAssignments(currentDate, newScheduleEntries);
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-400/30">
                <Compass className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                每日每班次船員精準調度矩陣 (Trip-by-Trip Dispatch)
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              可獨立指定單日每一航次 (如南竿-北竿 22 班、莒光 3 班) 之執勤船員，即時連動台灣船員法防疲勞防呆計算。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Date Stepper */}
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
              <button
                onClick={handlePrevDay}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="上一日"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1.5 px-2">
                <CalendarIcon className="w-4 h-4 text-blue-400" />
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-white border-none focus:outline-hidden cursor-pointer"
                />
              </div>

              <button
                onClick={handleNextDay}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="下一日"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setShowBatchTools(!showBatchTools)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                showBatchTools 
                  ? 'bg-amber-500 text-slate-900 border-amber-400 shadow-sm' 
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              {showBatchTools ? '收合批次快選工具' : '展開批次快選工具'}
            </button>

            <button
              onClick={handleSaveAndApply}
              disabled={isSavedNotice}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md transition-all"
            >
              {isSavedNotice ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 animate-pulse" />
                  <span>儲存更新成功！</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-amber-300" />
                  <span>確認儲存本日班次調度</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Batch Dispatch Quick Drawer (Collapsible) */}
        {showBatchTools && (
          <div className="p-4 bg-amber-50/80 border-b border-amber-200 text-xs space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600" />
                批次梯次一鍵套用工具（快速將整套班組套用至對應時段之所有航班）
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoFillForeignCrew}
                  className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold rounded-md border border-purple-300"
                >
                  一鍵帶入外籍固定船員
                </button>
                <button
                  onClick={handleClearDayAssignments}
                  className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold rounded-md border border-rose-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  清空本日指派
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Morning Shift A preset */}
              <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2">
                <div className="font-bold text-emerald-900 flex items-center justify-between">
                  <span>早班梯次班組 (Shift A 07:00 ~ 12:00)：</span>
                  <button
                    onClick={handleApplyBatchMorning}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[11px]"
                  >
                    套用至所有早班航次
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">早班船長</label>
                    <select
                      value={batchMorningCaptain}
                      onChange={(e) => setBatchMorningCaptain(e.target.value)}
                      className="w-full p-1 bg-slate-50 border border-slate-300 rounded text-xs"
                    >
                      <option value="">選擇船長...</option>
                      {crewList.filter(c => c.role === 'CAPTAIN').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">早班輪機長</label>
                    <select
                      value={batchMorningEngineer}
                      onChange={(e) => setBatchMorningEngineer(e.target.value)}
                      className="w-full p-1 bg-slate-50 border border-slate-300 rounded text-xs"
                    >
                      <option value="">選擇輪機長...</option>
                      {crewList.filter(c => c.role === 'CHIEF_ENGINEER').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">早班水手</label>
                    <select
                      value={batchMorningDeckhand}
                      onChange={(e) => setBatchMorningDeckhand(e.target.value)}
                      className="w-full p-1 bg-slate-50 border border-slate-300 rounded text-xs"
                    >
                      <option value="">選擇水手...</option>
                      {crewList.filter(c => c.role === 'DECKHAND' || c.role === 'CHIEF_MATE').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Afternoon Shift B preset */}
              <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2">
                <div className="font-bold text-blue-900 flex items-center justify-between">
                  <span>午班梯次班組 (Shift B 13:00 ~ 17:50)：</span>
                  <button
                    onClick={handleApplyBatchAfternoon}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-[11px]"
                  >
                    套用至所有午班航次
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">午班船長</label>
                    <select
                      value={batchAfternoonCaptain}
                      onChange={(e) => setBatchAfternoonCaptain(e.target.value)}
                      className="w-full p-1 bg-slate-50 border border-slate-300 rounded text-xs"
                    >
                      <option value="">選擇船長...</option>
                      {crewList.filter(c => c.role === 'CAPTAIN').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">午班輪機長</label>
                    <select
                      value={batchAfternoonEngineer}
                      onChange={(e) => setBatchAfternoonEngineer(e.target.value)}
                      className="w-full p-1 bg-slate-50 border border-slate-300 rounded text-xs"
                    >
                      <option value="">選擇輪機長...</option>
                      {crewList.filter(c => c.role === 'CHIEF_ENGINEER').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">午班水手</label>
                    <select
                      value={batchAfternoonDeckhand}
                      onChange={(e) => setBatchAfternoonDeckhand(e.target.value)}
                      className="w-full p-1 bg-slate-50 border border-slate-300 rounded text-xs"
                    >
                      <option value="">選擇水手...</option>
                      {crewList.filter(c => c.role === 'DECKHAND' || c.role === 'CHIEF_MATE').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter and Overview Bar */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700">班次篩選：</span>
            
            <select
              value={selectedRouteFilter}
              onChange={(e) => setSelectedRouteFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
            >
              <option value="ALL">全部航線</option>
              {INITIAL_ROUTES.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            <select
              value={selectedVesselFilter}
              onChange={(e) => setSelectedVesselFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
            >
              <option value="ALL">全部船舶</option>
              {vessels.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>

            <select
              value={selectedShiftFilter}
              onChange={(e) => setSelectedShiftFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
            >
              <option value="ALL">全部梯次</option>
              <option value="MORNING">早班梯次 (07:00~12:00)</option>
              <option value="AFTERNOON">午班梯次 (13:00~17:50)</option>
              <option value="FULL_DAY">全日值航梯次</option>
              <option value="NIGHT">長程夜航班次</option>
            </select>
          </div>

          {/* Quick Labor Compliance Indicator */}
          <div className="flex items-center gap-3">
            {dailyIssues.filter(i => i.type === 'ERROR').length === 0 ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                本日班次指派符合船員法規
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                {dailyIssues.filter(i => i.type === 'ERROR').length} 項指派違規
              </span>
            )}
            <span className="text-slate-500 font-mono text-[11px]">
              共 {displayTrips.length} 班次待排
            </span>
          </div>
        </div>

        {/* Main Body: Two Columns (Left: Trips Grid, Right: Daily Crew Hours & Fatigue Monitor) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          
          {/* Left Column (3/4): Trips & Role Slots Assignment Cards */}
          <div className="lg:col-span-3 overflow-y-auto p-4 space-y-4 max-h-[calc(92vh-180px)]">
            {displayTrips.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                無符合篩選條件的班次
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {displayTrips.map(trip => {
                  const asgn = assignments[trip.id] || {
                    tripId: trip.id,
                    vesselId: trip.defaultVesselId,
                    slots: [],
                  };
                  const route = INITIAL_ROUTES.find(r => r.id === trip.routeId);
                  const vessel = vesselMap.get(asgn.vesselId) || vessels[0];

                  return (
                    <div
                      key={trip.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-3.5 space-y-3"
                    >
                      {/* Trip Header */}
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold rounded text-xs">
                              {trip.tripCode}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">
                              {trip.departurePort} ➔ {trip.arrivalPort}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{trip.departureTime} ~ {trip.arrivalTime} ({Math.round(trip.voyageDurationHours * 60)}分)</span>
                            <span>‧</span>
                            <span>工時: {trip.totalDutyHours}h</span>
                          </div>
                        </div>

                        {/* Shift Badge & Vessel */}
                        <div className="text-right space-y-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            trip.shiftGroup === 'MORNING' ? 'bg-amber-100 text-amber-800' :
                            trip.shiftGroup === 'AFTERNOON' ? 'bg-blue-100 text-blue-800' :
                            trip.shiftGroup === 'NIGHT' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {trip.shiftGroup === 'MORNING' ? '早班 Shift A' :
                             trip.shiftGroup === 'AFTERNOON' ? '午班 Shift B' :
                             trip.shiftGroup === 'NIGHT' ? '夜航' : '全日值航'}
                          </span>
                          <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                            <Ship className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold text-slate-700">{vessel?.name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Required Role Slots for this specific trip */}
                      <div className="space-y-2">
                        {asgn.slots.map((slot) => {
                          const currentCrew = crewMap.get(slot.crewId);
                          const qual = currentCrew && vessel 
                            ? checkCrewQualification(currentCrew, vessel, slot.role, currentDate)
                            : null;

                          return (
                            <div
                              key={`${slot.role}-${slot.index}`}
                              className="p-2 rounded-lg bg-slate-50/90 border border-slate-200 text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                                  <span>{slot.role}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    #{slot.index + 1}
                                  </span>
                                </span>

                                {/* Cover Checkbox */}
                                <label className="flex items-center gap-1 text-[11px] text-amber-800 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={slot.isCover}
                                    onChange={(e) => handleSlotCoverToggle(trip.id, slot.role, slot.index, e.target.checked)}
                                    className="rounded text-amber-600 focus:ring-amber-500"
                                  />
                                  <span>代班</span>
                                </label>
                              </div>

                              {/* Crew Selector Dropdown */}
                              <div className="flex items-center gap-2">
                                <select
                                  value={slot.crewId}
                                  onChange={(e) => handleSlotCrewChange(trip.id, slot.role, slot.index, e.target.value)}
                                  className={`w-full px-2 py-1.5 rounded-md border text-xs font-medium focus:ring-2 focus:ring-blue-500 ${
                                    !slot.crewId
                                      ? 'bg-rose-50/70 border-rose-300 text-rose-800'
                                      : qual && !qual.isEligible
                                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                                      : 'bg-white border-slate-300 text-slate-800'
                                  }`}
                                >
                                  <option value="">-- 尚未指派 (點擊選擇船員) --</option>
                                  {crewList.map((c) => {
                                    const candidateQual = vessel ? checkCrewQualification(c, vessel, slot.role, currentDate) : { isEligible: true };
                                    const cStats = crewDailyStats[c.id];
                                    const isLeave = cStats?.isOnLeave;
                                    const todayHours = cStats?.totalHours || 0;

                                    return (
                                      <option key={c.id} value={c.id}>
                                        {c.name} ({c.role} ‧ {c.rankLevel})
                                        {candidateQual.isEligible ? ' [✓適任]' : ' [✕資格不符]'}
                                        {isLeave ? ' [休假中]' : ''}
                                        {` (今日已排: ${todayHours}h)`}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              {/* Dynamic Status / Disqualification Warnings */}
                              {currentCrew && qual && !qual.isEligible && (
                                <div className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  <span>不符資格: {qual.reasons.join(', ')}</span>
                                </div>
                              )}

                              {currentCrew && crewDailyStats[currentCrew.id]?.isOnLeave && (
                                <div className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  <span>警示: 該員今日已核准請假！</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column (1/4): Real-time Daily Crew Hours & Fatigue Monitor */}
          <div className="lg:col-span-1 overflow-y-auto p-4 bg-slate-50 space-y-4 max-h-[calc(92vh-180px)]">
            <div className="space-y-1 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>本日各船員即時排定工時 (防疲勞監控)</span>
              </div>
              <p className="text-[10px] text-slate-500">
                依據今日指派之班次即時計算累計工時與連續出勤狀態
              </p>
            </div>

            {/* Daily Violation Warnings List */}
            {dailyIssues.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>排班違規警示 ({dailyIssues.length})：</span>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {dailyIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded text-[10px] font-medium border ${
                        issue.type === 'ERROR'
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      {issue.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Crew Cards List */}
            <div className="space-y-2">
              {crewList.map(crew => {
                const st = crewDailyStats[crew.id];
                if (!st) return null;
                const isAssigned = st.assignedTrips.length > 0;

                return (
                  <div
                    key={crew.id}
                    className={`p-2.5 rounded-xl border text-xs transition-all ${
                      st.isOver12h || st.hasTimeConflict
                        ? 'bg-rose-50 border-rose-300'
                        : st.isOver8h
                        ? 'bg-amber-50/70 border-amber-300'
                        : isAssigned
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-100/60 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{crew.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {crew.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {crew.nationality === 'TW' ? '本國籍' : `外籍固定(${crew.fixedVesselId})`}
                        </div>
                      </div>

                      {/* Hours Metric */}
                      <div className="text-right">
                        <div className={`font-mono font-bold text-sm ${
                          st.isOver12h ? 'text-rose-600 font-extrabold' :
                          st.isOver8h ? 'text-amber-600' : 'text-slate-800'
                        }`}>
                          {st.totalHours} <span className="text-[10px] font-normal">小時</span>
                        </div>
                        <div className="text-[9px] text-slate-400">
                          已派 {st.assignedTrips.length} 班次
                        </div>
                      </div>
                    </div>

                    {/* Assigned Trip Codes Tags */}
                    {isAssigned && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-1.5 border-t border-black/5">
                        {st.assignedTrips.map(t => (
                          <span
                            key={t.id}
                            className="px-1.5 py-0.2 bg-blue-50 text-blue-700 font-mono text-[9px] rounded font-semibold border border-blue-100"
                          >
                            {t.tripCode} ({t.departureTime})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            💡 <strong>調度提示：</strong>每班次皆可獨立更換人員。高頻航線建議 07:00~12:00 (早班) 與 13:00~17:50 (午班) 分由兩組船員執勤，防止單日超過 12 小時法規上限。
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold"
            >
              取消關閉
            </button>
            <button
              onClick={handleSaveAndApply}
              disabled={isSavedNotice}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              {isSavedNotice ? '儲存成功！' : '確認儲存本日班次調度'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
