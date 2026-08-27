import React, { useState } from 'react';
import { 
  Ship, 
  ShieldAlert, 
  CheckCircle, 
  Users, 
  Award, 
  Edit3, 
  AlertCircle, 
  Navigation,
  CheckCircle2,
  XCircle,
  Sparkles,
  Search,
  Check,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { Vessel, CrewMember, Route, UserRole } from '../types';
import { checkCrewQualification, auditFleetQualifications, FleetQualificationAuditReport } from '../services/schedulingEngine';

interface VesselSafetyViewProps {
  vessels: Vessel[];
  routes?: Route[];
  crewList: CrewMember[];
  userRole: UserRole;
  selectedMonth?: string;
  onNavigateToSchedule?: () => void;
  onUpdateVessel?: (vessel: Vessel) => void;
}

export const VesselSafetyView: React.FC<VesselSafetyViewProps> = ({
  vessels,
  routes = [],
  crewList,
  userRole,
  selectedMonth,
  onNavigateToSchedule,
  onUpdateVessel,
}) => {
  const [selectedVesselId, setSelectedVesselId] = useState<string>(vessels[0]?.id || '');
  const [editingVessel, setEditingVessel] = useState<Vessel | null>(null);

  // Qualification Interactive Verification State
  const [checkerVesselId, setCheckerVesselId] = useState<string>(vessels[0]?.id || '');
  const [checkerCrewId, setCheckerCrewId] = useState<string>(crewList[0]?.id || '');
  const [auditReport, setAuditReport] = useState<FleetQualificationAuditReport | null>(null);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);

  const selectedVessel = vessels.find(v => v.id === selectedVesselId) || vessels[0];
  const currentRoute = routes.find(r => r.id === selectedVessel?.routeId);

  // Selected crew for live qualification verification
  const testCrew = crewList.find(c => c.id === checkerCrewId) || crewList[0];
  const testVessel = vessels.find(v => v.id === checkerVesselId) || vessels[0];
  const testQualResult = testCrew && testVessel ? checkCrewQualification(testCrew, testVessel, testCrew.role) : null;

  // 計算每艘船舶符合資格的船員人數
  const getEligibleCrewForRole = (vessel: Vessel, role: any) => {
    return crewList.filter(crew => {
      const qual = checkCrewQualification(crew, vessel, role);
      return qual.isEligible;
    });
  };

  const getIneligibleCrewForRole = (vessel: Vessel, role: any) => {
    return crewList.filter(crew => {
      if (crew.role !== role && !crew.rankLevel.includes(role)) return false;
      const qual = checkCrewQualification(crew, vessel, role);
      return !qual.isEligible;
    });
  };

  const handleSaveVesselEdit = () => {
    if (editingVessel && onUpdateVessel) {
      onUpdateVessel(editingVessel);
      setEditingVessel(null);
    }
  };

  const handleRunFleetAudit = () => {
    const report = auditFleetQualifications(crewList, vessels);
    setAuditReport(report);
    setShowAuditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Overview Top Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Ship className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-800">船舶安全配置表規範與適任資格引擎</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              依交通部航港局船舶法與 STCW 公約標準，系統以「每艘船獨立安全配置表」作為排班與資格比對之最終依據，嚴禁非適任派工。
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="run-fleet-audit-btn"
              onClick={handleRunFleetAudit}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              執行全船隊適任性自動比對稽核
            </button>

            {userRole === 'ADMIN' && onUpdateVessel && (
              <button
                id="edit-vessel-spec-btn"
                onClick={() => setEditingVessel(JSON.parse(JSON.stringify(selectedVessel)))}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                編輯配置規範
              </button>
            )}
          </div>
        </div>

        {/* Vessel Selector Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-5">
          {vessels.map((v) => {
            const isSelected = v.id === selectedVesselId;
            return (
              <button
                key={v.id}
                id={`select-vessel-${v.id}`}
                onClick={() => setSelectedVesselId(v.id)}
                className={`p-3 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    v.tonnageCategory === '497T' ? 'bg-indigo-100 text-indigo-700' :
                    v.tonnageCategory === '350T' ? 'bg-cyan-100 text-cyan-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {v.tonnage} 噸
                  </span>
                  <span className="text-xs font-bold text-slate-700">{v.minSafetyManning} 人</span>
                </div>
                <div className="font-bold text-sm text-slate-800 mt-1 truncate">{v.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{routes.find(r => r.id === v.routeId)?.name || '營運航線'}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Vessel Safety Detail Spec */}
      {selectedVessel && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-white">{selectedVessel.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-300 border border-blue-400/30">
                    {selectedVessel.tonnageCategory} 級 ({selectedVessel.tonnage} GT)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                    營運中
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-blue-400" />
                  指派航線：<strong>{currentRoute?.name || '專案定線航行'}</strong> ({currentRoute?.origin || '基隆'} ↔ {currentRoute?.destination || '馬祖'}，標準航程 {currentRoute?.standardDurationHours || 8} 小時)
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="text-center px-2">
                  <div className="text-[11px] text-slate-300">法定最低配置</div>
                  <div className="text-2xl font-black text-amber-300">{selectedVessel.minSafetyManning} <span className="text-xs font-normal">人</span></div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center px-2">
                  <div className="text-[11px] text-slate-300">編制職務項數</div>
                  <div className="text-2xl font-black text-white">{selectedVessel.safetyRequirements.length} <span className="text-xs font-normal">職位</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Safety Manning Requirements Matrix */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-600" />
                船舶法定安全配置職位與適任資格比對表
              </h4>
              <span className="text-xs text-slate-500">
                * 系統排班自動比對適任證書、等級、有效期及黑白名單
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">編制職務</th>
                    <th className="py-3 px-3 text-center">法定最低人數</th>
                    <th className="py-3 px-4">法定要求等級 / 職級</th>
                    <th className="py-3 px-4">必備適任證書要求 (STCW)</th>
                    <th className="py-3 px-4">全公司符合資格可任職人員</th>
                    <th className="py-3 px-4">不符資格 / 受限人員</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedVessel.safetyRequirements.map((req) => {
                    const eligibleCrew = getEligibleCrewForRole(selectedVessel, req.role);
                    const ineligibleCrew = getIneligibleCrewForRole(selectedVessel, req.role);

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            {req.role}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold">
                            {req.minCount} 人
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {req.requiredRank.map((r, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {req.requiredCertTypes.map((c, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] border border-indigo-100 flex items-center gap-1">
                                <Award className="w-3 h-3 text-indigo-500" />
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {eligibleCrew.length > 0 ? (
                              eligibleCrew.map((c) => (
                                <span
                                  key={c.id}
                                  className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                                    c.nationality === 'TW'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-purple-50 text-purple-700 border-purple-200'
                                  }`}
                                  title={`${c.name} (${c.rankLevel}) - 證書效期: ${c.certExpiryDate}`}
                                >
                                  {c.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-rose-500 text-xs font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> 暫無完全符合資格人員
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            共 {eligibleCrew.length} 位合格儲備
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {ineligibleCrew.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {ineligibleCrew.map((c) => {
                                const qual = checkCrewQualification(c, selectedVessel, req.role);
                                return (
                                  <span
                                    key={c.id}
                                    className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-500 line-through border border-slate-200 cursor-help"
                                    title={`${c.name} 不符原因: ${qual.reasons.join('; ')}`}
                                  >
                                    {c.name}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Special Regulation Notice */}
            <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>船舶配置自動排班防呆機制：</strong>
                系統在執行自動排班或管理人員手動調班時，會即刻檢驗「全船總人數 ≥ {selectedVessel.minSafetyManning}人」、「各職務人員符合法定證書及等級」、「同一時間未被排至他船」、「非請假期間」等 5 道安全鎖。
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Live Qualification Cross-Checker Tool */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <FileCheck className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-bold text-slate-800 text-base">適任資格即時交叉比對引擎 (Live Cross-Checker)</h3>
            <p className="text-xs text-slate-500">選擇任一位船員與船舶，系統即時剖析 6 大合規檢查項與具體判定理由</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">受檢船員 (Crew)</label>
            <select
              id="checker-crew-select"
              value={checkerCrewId}
              onChange={(e) => setCheckerCrewId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              {crewList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.nationality === 'TW' ? '本國籍' : '外籍'}) - {c.role} [{c.rankLevel}] - 證書效期: {c.certExpiryDate}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">目標船舶 (Target Vessel)</label>
            <select
              id="checker-vessel-select"
              value={checkerVesselId}
              onChange={(e) => setCheckerVesselId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              {vessels.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.tonnageCategory} 級 - {v.tonnage} 噸) - 安全配置 {v.minSafetyManning} 人
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Result Diagnostic Panel */}
        {testQualResult && testCrew && testVessel && (
          <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg text-white font-bold text-sm flex items-center gap-1.5 ${
                  testQualResult.isEligible ? 'bg-emerald-600' : 'bg-rose-600'
                }`}>
                  {testQualResult.isEligible ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  {testQualResult.isEligible ? '適任資格符合 (合格可派)' : '資格不符 (系統自動阻擋)'}
                </div>
                <div className="text-xs text-slate-600">
                  測試對象：<strong>{testCrew.name}</strong> 擔任 <strong>{testVessel.name}</strong> 之 <strong>{testCrew.role}</strong>
                </div>
              </div>
              <span className="text-[11px] text-slate-500">
                證書效期: {testCrew.certExpiryDate}
              </span>
            </div>

            {/* Criteria Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {/* 1. Rank Match */}
              <div className={`p-3 rounded-lg border text-xs ${
                testQualResult.criteriaBreakdown.rankMatch.passed
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>1. 法定職等匹配</span>
                  {testQualResult.criteriaBreakdown.rankMatch.passed ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                </div>
                <p className="text-[11px] leading-relaxed">{testQualResult.criteriaBreakdown.rankMatch.message}</p>
              </div>

              {/* 2. Certificate Expiry */}
              <div className={`p-3 rounded-lg border text-xs ${
                testQualResult.criteriaBreakdown.certExpiry.passed
                  ? (testQualResult.criteriaBreakdown.certExpiry.isExpiringSoon ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-emerald-50/70 border-emerald-200 text-emerald-900')
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>2. STCW 證書效期</span>
                  {testQualResult.criteriaBreakdown.certExpiry.passed ? (
                    testQualResult.criteriaBreakdown.certExpiry.isExpiringSoon ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> : <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                </div>
                <p className="text-[11px] leading-relaxed">{testQualResult.criteriaBreakdown.certExpiry.message}</p>
              </div>

              {/* 3. Allowed Vessel Whitelist */}
              <div className={`p-3 rounded-lg border text-xs ${
                testQualResult.criteriaBreakdown.vesselAllowed.passed
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>3. 可任職船舶名冊</span>
                  {testQualResult.criteriaBreakdown.vesselAllowed.passed ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                </div>
                <p className="text-[11px] leading-relaxed">{testQualResult.criteriaBreakdown.vesselAllowed.message}</p>
              </div>

              {/* 4. Forbidden Vessel Blacklist */}
              <div className={`p-3 rounded-lg border text-xs ${
                testQualResult.criteriaBreakdown.forbiddenVessel.passed
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>4. 船舶黑名單管制</span>
                  {testQualResult.criteriaBreakdown.forbiddenVessel.passed ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                </div>
                <p className="text-[11px] leading-relaxed">{testQualResult.criteriaBreakdown.forbiddenVessel.message}</p>
              </div>

              {/* 5. Foreign Fixed Assignment */}
              <div className={`p-3 rounded-lg border text-xs ${
                testQualResult.criteriaBreakdown.foreignFixedVessel.passed
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>5. 外籍固定配置規範</span>
                  {testQualResult.criteriaBreakdown.foreignFixedVessel.passed ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  )}
                </div>
                <p className="text-[11px] leading-relaxed">{testQualResult.criteriaBreakdown.foreignFixedVessel.message}</p>
              </div>

              {/* 6. Specific Safety Requirement Restriction */}
              <div className={`p-3 rounded-lg border text-xs ${
                testQualResult.criteriaBreakdown.blacklistedInReq.passed
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>6. 職務特約限制名冊</span>
                  {testQualResult.criteriaBreakdown.blacklistedInReq.passed ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                </div>
                <p className="text-[11px] leading-relaxed">{testQualResult.criteriaBreakdown.blacklistedInReq.message}</p>
              </div>
            </div>

            {/* Reasons / Warnings Summary */}
            {testQualResult.reasons.length > 0 && (
              <div className="mt-3 p-2.5 bg-rose-100/70 border border-rose-300 rounded-lg text-rose-900 text-xs">
                <strong className="block mb-1">不符資格判定原因 (Disqualification Reasons)：</strong>
                <ul className="list-disc list-inside space-y-0.5">
                  {testQualResult.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {testQualResult.warnings.length > 0 && (
              <div className="mt-2 p-2.5 bg-amber-100/70 border border-amber-300 rounded-lg text-amber-900 text-xs">
                <strong className="block mb-1">合規警示提醒 (Compliance Warnings)：</strong>
                <ul className="list-disc list-inside space-y-0.5">
                  {testQualResult.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fleet-Wide Audit Modal */}
      {showAuditModal && auditReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="text-lg font-bold text-slate-800">全船隊適任資格比對與法定配置稽核總表</h3>
                  <p className="text-xs text-slate-500">稽核時間：{new Date(auditReport.timestamp).toLocaleString('zh-TW')} ｜ 全體船員 {auditReport.totalCrew} 位 ｜ 船舶 {auditReport.totalVessels} 艘</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Audit Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="text-[11px] text-slate-500">檢核法定職位項數</div>
                <div className="text-xl font-black text-slate-800">{auditReport.totalRequirements} 項</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <div className="text-[11px] text-emerald-700">儲備充足職位</div>
                <div className="text-xl font-black text-emerald-700">{auditReport.fullyCoveredRequirements} 項</div>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                <div className="text-[11px] text-rose-700">儲備吃緊或待補</div>
                <div className="text-xl font-black text-rose-700">{auditReport.atRiskRequirements} 項</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                <div className="text-[11px] text-amber-700">90天內即將屆期證書</div>
                <div className="text-xl font-black text-amber-700">{auditReport.expiringSoonCertsCount} 張</div>
              </div>
            </div>

            {/* Vessel by Vessel Audit List */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {auditReport.vesselReports.map(({ vessel, requirementsAudit }) => (
                <div key={vessel.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Ship className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-800 text-sm">{vessel.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">{vessel.tonnageCategory} ({vessel.tonnage}T)</span>
                    </div>
                    <span className="text-xs text-slate-600 font-semibold">法定配置: {vessel.minSafetyManning} 人</span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {requirementsAudit.map(({ requirement, eligibleCrew, isCovered, ineligibleCrewWithReasons }) => (
                      <div key={requirement.id} className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{requirement.role}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">需 {requirement.minCount} 人</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCovered ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isCovered ? '儲備合規' : '儲備吃緊'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            可指派合格船員 ({eligibleCrew.length} 人)：{eligibleCrew.map(c => c.name).join('、') || '無'}
                          </div>
                        </div>

                        {ineligibleCrewWithReasons.length > 0 && (
                          <div className="text-[11px] text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-100 max-w-sm">
                            <span className="font-semibold">受限/不符：</span>
                            {ineligibleCrewWithReasons.map(i => `${i.crew.name} (${i.reasons[0] || '不符'})`).join('; ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-200">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                關閉稽核視窗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Modal */}
      {editingVessel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                編輯【{editingVessel.name}】安全配置規範
              </h3>
              <button
                onClick={() => setEditingVessel(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">船舶名稱</label>
                  <input
                    type="text"
                    value={editingVessel.name}
                    onChange={(e) => setEditingVessel({ ...editingVessel, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">最低安全配置總人數</label>
                  <input
                    type="number"
                    value={editingVessel.minSafetyManning}
                    onChange={(e) => setEditingVessel({ ...editingVessel, minSafetyManning: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">各職務最低配置人數</label>
                <div className="space-y-2">
                  {editingVessel.safetyRequirements.map((req, idx) => (
                    <div key={req.id} className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="font-bold text-slate-800 w-24">{req.role}</div>
                      <div className="flex items-center gap-1">
                        <span>人數：</span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={req.minCount}
                          onChange={(e) => {
                            const newReqs = [...editingVessel.safetyRequirements];
                            newReqs[idx].minCount = Number(e.target.value);
                            setEditingVessel({ ...editingVessel, safetyRequirements: newReqs });
                          }}
                          className="w-16 p-1 border border-slate-300 rounded text-center"
                        />
                      </div>
                      <div className="text-slate-500 flex-1 truncate">
                        接受職級：{req.requiredRank.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                onClick={() => setEditingVessel(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                取消
              </button>
              <button
                id="save-vessel-edit-btn"
                onClick={handleSaveVesselEdit}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                儲存配置變更
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

