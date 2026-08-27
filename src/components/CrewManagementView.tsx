import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Ship, 
  Calendar, 
  Phone, 
  Edit3, 
  ExternalLink,
  Shield,
  FileText,
  Clock
} from 'lucide-react';
import { CrewMember, Vessel, CrewRole, CertificateRank, Nationality, UserRole } from '../types';

interface CrewManagementViewProps {
  crewList: CrewMember[];
  vessels: Vessel[];
  userRole: UserRole;
  onAddCrew: (crew: CrewMember) => void;
  onUpdateCrew: (crew: CrewMember) => void;
}

export const CrewManagementView: React.FC<CrewManagementViewProps> = ({
  crewList,
  vessels,
  userRole,
  onAddCrew,
  onUpdateCrew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [nationalityFilter, setNationalityFilter] = useState<'ALL' | 'TW' | 'FOREIGN'>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<CrewMember>>({});

  const filteredCrew = crewList.filter(crew => {
    const matchesSearch = 
      crew.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crew.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (crew.englishName && crew.englishName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesNat = nationalityFilter === 'ALL' || crew.nationality === nationalityFilter;
    const matchesRole = roleFilter === 'ALL' || crew.role === roleFilter;

    return matchesSearch && matchesNat && matchesRole;
  });

  const expiringCrew = crewList.filter(c => {
    const expiry = new Date(c.certExpiryDate).getTime();
    const now = new Date().getTime();
    const days = (expiry - now) / (1000 * 3600 * 24);
    return days <= 90;
  });

  const handleOpenEdit = (crew: CrewMember) => {
    setSelectedCrew(crew);
    setEditFormData(JSON.parse(JSON.stringify(crew)));
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editFormData && editFormData.id) {
      onUpdateCrew(editFormData as CrewMember);
      setSelectedCrew(editFormData as CrewMember);
      setIsEditing(false);
    }
  };

  const handleOpenAdd = () => {
    const newId = `C-TW-${(crewList.filter(c => c.nationality === 'TW').length + 1).toString().padStart(2, '0')}`;
    const newCrew: CrewMember = {
      id: newId,
      code: `TW-${(crewList.filter(c => c.nationality === 'TW').length + 1).toString().padStart(3, '0')}`,
      name: '',
      nationality: 'TW',
      role: '水手',
      rankLevel: '通用乙級船員',
      certificates: [
        {
          id: 'CERT-' + Math.random().toString(36).substr(2, 6),
          name: 'STCW 助理級航行當值適任證書',
          certNo: 'TW-NEW-001',
          issueDate: '2024-01-01',
          expiryDate: '2029-01-01',
          issuingAuthority: '交通部航港局',
          isCompliant: true,
        }
      ],
      certExpiryDate: '2029-01-01',
      allowedVessels: vessels.map(v => v.id),
      phone: '0900-000-000',
      hireDate: new Date().toISOString().split('T')[0],
      baseSalary: 55000,
      standardMonthlyRestDays: 8,
      takenMonthlyRestDays: 0,
      annualLeaveTotal: 7,
      annualLeaveTaken: 0,
      status: 'ACTIVE',
    };
    setEditFormData(newCrew);
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-800">船員適任資格與履歷管理系統</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              登錄本國籍 30+ 人與外籍 16 人完整 STCW 適任證書、航行資歷、固定配置船舶及證照效期追蹤。
            </p>
          </div>

          <div className="flex items-center gap-3">
            {userRole === 'ADMIN' && (
              <button
                id="add-crew-btn"
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增船員基本資料
              </button>
            )}
          </div>
        </div>

        {/* Expiring Warning Alert */}
        {expiringCrew.length > 0 && (
          <div className="mt-4 p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 flex-1">
              <span className="font-bold">適任證書效期預警提醒：</span>
              現有 <strong>{expiringCrew.length}</strong> 位船員證書將於 90 天內屆期 (例如：
              {expiringCrew.map(c => `${c.name} - ${c.certExpiryDate}`).join('、')}
              )，系統已自動提示排班管理員，並列入換證進度追蹤。
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋船員姓名、英文名、代碼 (如 TW-001 / FN-001)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={nationalityFilter}
              onChange={(e) => setNationalityFilter(e.target.value as any)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">國籍：全部 ({crewList.length}人)</option>
              <option value="TW">本國籍船員 ({crewList.filter(c => c.nationality === 'TW').length}人)</option>
              <option value="FOREIGN">外籍船員 ({crewList.filter(c => c.nationality === 'FOREIGN').length}人)</option>
            </select>
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">全部職務</option>
              <option value="船長">船長</option>
              <option value="大副">大副</option>
              <option value="二副">二副</option>
              <option value="輪機長">輪機長</option>
              <option value="大管輪">大管輪</option>
              <option value="管輪">管輪</option>
              <option value="水手長">水手長 / 水手</option>
              <option value="機匠">機匠長 / 機匠</option>
            </select>
          </div>
        </div>
      </div>

      {/* Crew Table List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">代碼 / 姓名</th>
                <th className="py-3 px-3">國籍類別</th>
                <th className="py-3 px-3">職務</th>
                <th className="py-3 px-3">適任等級 (STCW)</th>
                <th className="py-3 px-4">證書有效期限</th>
                <th className="py-3 px-4">可任職船舶 / 固定船舶</th>
                <th className="py-3 px-3 text-center">當月休假狀況</th>
                <th className="py-3 px-3 text-right">基本底薪</th>
                <th className="py-3 px-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCrew.map((crew) => {
                const isExpiringSoon = new Date(crew.certExpiryDate).getTime() - new Date().getTime() <= 90 * 24 * 3600 * 1000;
                const fixedVessel = vessels.find(v => v.id === crew.fixedVesselId);

                return (
                  <tr key={crew.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {crew.code}
                        </span>
                        <span>{crew.name}</span>
                      </div>
                      {crew.englishName && (
                        <div className="text-[10px] text-slate-400 font-mono">{crew.englishName}</div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        crew.nationality === 'TW'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {crew.nationality === 'TW' ? '🇹🇼 本國籍' : '🌐 外籍固定'}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {crew.role}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {crew.rankLevel}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className={isExpiringSoon ? 'text-amber-600 font-bold' : 'text-slate-600'}>
                          {crew.certExpiryDate}
                        </span>
                        {isExpiringSoon && (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] rounded font-semibold">
                            即將屆期
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {crew.fixedVesselId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] rounded font-semibold border border-indigo-100">
                          <Ship className="w-3 h-3 text-indigo-500" />
                          固定：{fixedVessel?.name || crew.fixedVesselId}
                        </span>
                      ) : (
                        <div className="text-[11px] text-slate-600">
                          全船隊適用 ({crew.allowedVessels.length} 艘船)
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="text-[11px] font-medium text-slate-700">
                        已休 {crew.takenMonthlyRestDays} / 應休 {crew.standardMonthlyRestDays} 天
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                      ${crew.baseSalary.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedCrew(crew)}
                          className="px-2.5 py-1 text-[11px] text-blue-600 hover:bg-blue-50 rounded font-medium transition-colors"
                        >
                          查看證照
                        </button>
                        {userRole === 'ADMIN' && (
                          <button
                            onClick={() => handleOpenEdit(crew)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                            title="編輯資料"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Crew Detail / Certificate Inspector Drawer Modal */}
      {selectedCrew && !isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                  {selectedCrew.name.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-800">{selectedCrew.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                      {selectedCrew.code}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                      {selectedCrew.rankLevel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{selectedCrew.englishName || 'N/A'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCrew(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              {/* Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-400">職務</div>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedCrew.role}</div>
                </div>
                <div>
                  <div className="text-slate-400">國籍類型</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {selectedCrew.nationality === 'TW' ? '本國籍船員' : '外籍固定配置船員'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">固定配置船舶</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {selectedCrew.fixedVesselId ? vessels.find(v => v.id === selectedCrew.fixedVesselId)?.name : '機動調配 (全船隊)'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">到職日期</div>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedCrew.hireDate}</div>
                </div>
                <div>
                  <div className="text-slate-400">聯絡電話</div>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedCrew.phone}</div>
                </div>
                <div>
                  <div className="text-slate-400">基本月薪</div>
                  <div className="font-bold text-slate-800 mt-0.5">${selectedCrew.baseSalary.toLocaleString()}</div>
                </div>
              </div>

              {/* STCW Certificates List */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  已登錄 STCW 專業適任證書清單 ({selectedCrew.certificates.length} 張)
                </h4>
                <div className="space-y-2">
                  {selectedCrew.certificates.map((cert) => (
                    <div key={cert.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {cert.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          證書字號：<span className="font-mono">{cert.certNo}</span> ‧ 發證機關：{cert.issuingAuthority}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">有效期限</div>
                        <div className="text-xs font-bold text-slate-800 font-mono">{cert.expiryDate}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vessel Suitability List */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                  <Ship className="w-4 h-4 text-blue-600" />
                  各船舶安全配置任職資格自動評估
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {vessels.map((v) => {
                    const isAllowed = selectedCrew.allowedVessels.includes(v.id);
                    return (
                      <div
                        key={v.id}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                          isAllowed
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        <span className="font-medium truncate">{v.name}</span>
                        {isAllowed ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-200/60 text-emerald-900 rounded">
                            符合
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">不符</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                onClick={() => setSelectedCrew(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                關閉
              </button>
              {userRole === 'ADMIN' && (
                <button
                  onClick={() => handleOpenEdit(selectedCrew)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  編輯此船員
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">
                {editFormData.id ? `編輯船員：${editFormData.name || ''}` : '新增船員資料'}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">姓名</label>
                  <input
                    type="text"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">英文名</label>
                  <input
                    type="text"
                    value={editFormData.englishName || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, englishName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">國籍分類</label>
                  <select
                    value={editFormData.nationality || 'TW'}
                    onChange={(e) => setEditFormData({ ...editFormData, nationality: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="TW">本國籍船員</option>
                    <option value="FOREIGN">外籍船員</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">職務</label>
                  <select
                    value={editFormData.role || '水手'}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="船長">船長</option>
                    <option value="大副">大副</option>
                    <option value="二副">二副</option>
                    <option value="輪機長">輪機長</option>
                    <option value="大管輪">大管輪</option>
                    <option value="管輪">管輪</option>
                    <option value="水手長">水手長</option>
                    <option value="舵工">舵工</option>
                    <option value="水手">水手</option>
                    <option value="機匠長">機匠長</option>
                    <option value="機匠">機匠</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">適任等級</label>
                  <select
                    value={editFormData.rankLevel || '通用乙級船員'}
                    onChange={(e) => setEditFormData({ ...editFormData, rankLevel: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="一等船長">一等船長</option>
                    <option value="二等船長">二等船長</option>
                    <option value="三等船長">三等船長</option>
                    <option value="一等大副">一等大副</option>
                    <option value="二等大副">二等大副</option>
                    <option value="一等船副">一等船副</option>
                    <option value="二等船副">二等船副</option>
                    <option value="一等輪機長">一等輪機長</option>
                    <option value="二等輪機長">二等輪機長</option>
                    <option value="一等大管輪">一等大管輪</option>
                    <option value="二等大管輪">二等大管輪</option>
                    <option value="一等管輪">一等管輪</option>
                    <option value="二等管輪">二等管輪</option>
                    <option value="助理級航行當值">助理級航行當值</option>
                    <option value="助理級輪機當值">助理級輪機當值</option>
                    <option value="通用乙級船員">通用乙級船員</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">證書有效期限</label>
                  <input
                    type="date"
                    value={editFormData.certExpiryDate || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, certExpiryDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">固定指派船舶 (外籍或特定人員)</label>
                  <select
                    value={editFormData.fixedVesselId || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, fixedVesselId: e.target.value || undefined })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">無固定 (機動全船隊)</option>
                    {vessels.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.tonnageCategory})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">每月基本薪資 (NTD)</label>
                  <input
                    type="number"
                    value={editFormData.baseSalary || 50000}
                    onChange={(e) => setEditFormData({ ...editFormData, baseSalary: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                取消
              </button>
              <button
                id="save-crew-btn"
                onClick={handleSaveEdit}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                確認儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
