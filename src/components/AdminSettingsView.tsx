import React, { useState } from 'react';
import { 
  Settings, 
  ShieldAlert, 
  Coins, 
  Ship, 
  Sliders, 
  History, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  Save,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { Vessel, AllowanceRule, AuditLog, SafetyRequirement, CrewRole, CertificateRank } from '../types';

interface AdminSettingsViewProps {
  vessels: Vessel[];
  allowanceRules: AllowanceRule[];
  auditLogs: AuditLog[];
  onUpdateVessel: (vessel: Vessel) => void;
  onUpdateAllowanceRules: (rules: AllowanceRule[]) => void;
  onAddAuditLog: (action: string, targetType: any, targetId: string, targetName: string, details: string) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  vessels,
  allowanceRules,
  auditLogs,
  onUpdateVessel,
  onUpdateAllowanceRules,
  onAddAuditLog,
}) => {
  const [activeTab, setActiveTab] = useState<'RULES' | 'VESSELS' | 'AUDIT'>('RULES');
  const [editingRules, setEditingRules] = useState<AllowanceRule[]>(JSON.parse(JSON.stringify(allowanceRules)));
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [editingVessel, setEditingVessel] = useState<Vessel | null>(null);

  // 儲存津貼規則變更
  const handleSaveRules = () => {
    onUpdateAllowanceRules(editingRules);
    onAddAuditLog(
      'CONFIG_UPDATE',
      'ALLOWANCE_RULE',
      'RULES_CONFIG',
      '津貼規則參數設定',
      '管理者調整津貼核算費率與啟用狀態'
    );
    alert('津貼規則設定已成功儲存！');
  };

  // 切換津貼規則啟用狀態
  const handleToggleRuleActive = (ruleId: string) => {
    setEditingRules(prev => prev.map(r => r.id === ruleId ? { ...r, isActive: !r.isActive } : r));
  };

  // 修改津貼金額
  const handleRuleAmountChange = (ruleId: string, newAmount: number) => {
    setEditingRules(prev => prev.map(r => r.id === ruleId ? { ...r, baseAmount: newAmount } : r));
  };

  // 編輯船舶安全配置
  const handleSaveVesselSafety = () => {
    if (editingVessel) {
      // 重新計算總最低安全人數
      const totalMin = editingVessel.safetyRequirements.reduce((sum, r) => sum + r.minCount, 0);
      const updated = { ...editingVessel, minSafetyManning: totalMin };
      onUpdateVessel(updated);
      setSelectedVessel(updated);
      onAddAuditLog(
        'CONFIG_UPDATE',
        'VESSEL',
        updated.id,
        updated.name,
        `管理者調整【${updated.name}】安全配置表 (最低安全人數更新為 ${totalMin} 人)`
      );
      setEditingVessel(null);
      alert(`【${updated.name}】安全配置表已更新成功！`);
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
                <Settings className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-800">授權管理者後台設定中心</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              集中管理「船舶安全配置表」、「各項津貼計算費率與規則」及「系統操作異動審計日誌」。
            </p>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('RULES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'RULES' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              津貼規則設定
            </button>
            <button
              onClick={() => setActiveTab('VESSELS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'VESSELS' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Ship className="w-3.5 h-3.5" />
              船舶安全配置表
            </button>
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'AUDIT' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              異動審計日誌 ({auditLogs.length})
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Allowance Rules Configuration */}
      {activeTab === 'RULES' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-800">各項津貼計算費率與觸發規則設定</h3>
              <p className="text-xs text-slate-500">
                可自由調整航次津貼、497T/350T噸位加給、專業職務加給與夜航津貼之計發單價
              </p>
            </div>
            <button
              onClick={handleSaveRules}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm"
            >
              <Save className="w-4 h-4" />
              儲存津貼規則設定
            </button>
          </div>

          <div className="space-y-3">
            {editingRules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{rule.name}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-mono">
                      {rule.category}
                    </span>
                  </div>
                  <p className="text-slate-500">{rule.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">計發單價:</span>
                    <span className="font-bold text-slate-700">$</span>
                    <input
                      type="number"
                      value={rule.baseAmount}
                      onChange={(e) => handleRuleAmountChange(rule.id, Number(e.target.value))}
                      className="w-24 p-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-right"
                    />
                    <span className="text-slate-500">NTD</span>
                  </div>

                  <button
                    onClick={() => handleToggleRuleActive(rule.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                      rule.isActive
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                    }`}
                  >
                    {rule.isActive ? '啟用中' : '已停用'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Vessel Safety Configuration */}
      {activeTab === 'VESSELS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vessels.map((vessel) => (
              <div key={vessel.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{vessel.name}</h4>
                    <span className="text-xs text-slate-500">{vessel.tonnageCategory} ‧ 法定最低 {vessel.minSafetyManning} 人</span>
                  </div>
                  <button
                    onClick={() => setEditingVessel(JSON.parse(JSON.stringify(vessel)))}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    修改編制
                  </button>
                </div>

                <div className="space-y-1.5 text-xs">
                  {vessel.safetyRequirements.map((req) => (
                    <div key={req.id} className="flex items-center justify-between py-1 px-2 bg-slate-50 rounded">
                      <span className="font-medium text-slate-700">{req.role}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">{req.requiredRank.join('/')}</span>
                        <span className="font-bold text-slate-900 font-mono">{req.minCount} 人</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Edit Vessel Safety Modal */}
          {editingVessel && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <h3 className="text-base font-bold text-slate-800">
                    修改【{editingVessel.name}】安全配置表
                  </h3>
                  <button
                    onClick={() => setEditingVessel(null)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 py-4 text-xs">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                    請依交通部航港局核定之船舶安全配置表設定各職務最低法定配額：
                  </div>

                  <div className="space-y-2">
                    {editingVessel.safetyRequirements.map((req, idx) => (
                      <div key={req.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <div className="font-bold text-slate-800">{req.role}</div>
                          <div className="text-[10px] text-slate-400">所需等級：{req.requiredRank.join(' 或 ')}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">配置人數：</span>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={req.minCount}
                            onChange={(e) => {
                              const newCount = Number(e.target.value);
                              const updatedReqs = [...editingVessel.safetyRequirements];
                              updatedReqs[idx] = { ...req, minCount: newCount };
                              setEditingVessel({ ...editingVessel, safetyRequirements: updatedReqs });
                            }}
                            className="w-16 p-1.5 bg-white border border-slate-300 rounded text-center font-bold font-mono"
                          />
                          <span>人</span>
                        </div>
                      </div>
                    ))}
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
                    onClick={handleSaveVesselSafety}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                  >
                    儲存配置變更
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Audit Trail Log */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-800">系統異動審計日誌 (Audit Trail)</h3>
              <p className="text-xs text-slate-500">完整記錄所有排班調度、休假審核、代班標記與後台規則異動</p>
            </div>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
                      {log.action}
                    </span>
                    <span className="font-bold text-slate-900">{log.targetName}</span>
                    <span className="text-slate-400">‧ 操作者：{log.performedByName} ({log.performedByRole})</span>
                  </div>
                  <p className="text-slate-600">{log.details}</p>
                </div>
                <div className="font-mono text-slate-400 text-[11px] whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
