import React from 'react';
import { 
  Ship, 
  Users, 
  Calendar, 
  Clock, 
  Coins, 
  FileSpreadsheet, 
  Settings, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  CalendarCheck,
  UserCheck,
  Anchor,
  Layers
} from 'lucide-react';
import { UserRole, ComplianceValidation } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  pendingLeaveCount: number;
  userName?: string;
  systemVersion?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  pendingLeaveCount,
  userName = '陳大文 (船務調度長)',
  systemVersion = 'v2.4.0-Enterprise',
}) => {
  const navItems = [
    { id: 'SCHEDULE', label: '智慧自動排班', icon: Calendar, roles: ['CREW', 'DISPATCHER', 'DISPATCH', 'HR', 'ADMIN'] },
    { id: 'SAFETY', label: '船舶安全配置', icon: Ship, roles: ['CREW', 'DISPATCHER', 'DISPATCH', 'HR', 'ADMIN'] },
    { id: 'CREW', label: '船員適任資格', icon: Users, roles: ['DISPATCHER', 'DISPATCH', 'HR', 'ADMIN'] },
    { 
      id: 'LEAVE', 
      label: userRole === 'CREW' ? '我的休假搶選' : '休假審核餘假', 
      icon: CalendarCheck, 
      roles: ['CREW', 'DISPATCHER', 'DISPATCH', 'HR', 'ADMIN'],
      badge: userRole !== 'CREW' && pendingLeaveCount > 0 ? pendingLeaveCount : undefined
    },
    { id: 'WORKHOURS', label: '工時統計分析', icon: Clock, roles: ['CREW', 'DISPATCHER', 'DISPATCH', 'HR', 'ADMIN'] },
    { id: 'ALLOWANCES', label: '薪資津貼結算', icon: Coins, roles: ['CREW', 'DISPATCHER', 'DISPATCH', 'HR', 'ADMIN'] },
    { id: 'PAYROLL', label: '全體薪資單發放', icon: ShieldCheck, roles: ['CREW', 'HR', 'ADMIN'] },
    { id: 'REPORTS', label: '營運報表中心', icon: FileSpreadsheet, roles: ['DISPATCHER', 'DISPATCH', 'HR', 'ADMIN'] },
    { id: 'SETTINGS', label: '系統設定與日誌', icon: Settings, roles: ['ADMIN', 'DISPATCHER', 'DISPATCH'] },
  ];

  const visibleNav = navItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="text-white font-bold text-base tracking-tight flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded mr-2.5 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-blue-500/20">
            CMS
          </div>
          <div>
            <div className="text-white font-bold leading-none text-sm">船員智慧管理系統</div>
            <div className="text-[10px] text-slate-400 font-normal mt-1">Crew Management System</div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-3 overflow-y-auto space-y-0.5">
        <div className="px-5 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          主要功能模組
        </div>
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-item px-5 py-3 text-sm flex items-center justify-between cursor-pointer ${
                isActive ? 'active text-white' : 'text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className="font-medium text-xs sm:text-sm">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                  {item.badge}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-800 text-xs bg-slate-950/40">
        <div className="flex justify-between items-center mb-1 text-slate-400 text-[11px]">
          <span>目前登入身分</span>
          <span className="text-slate-200 font-medium">{userName}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            在線連線中
          </span>
          <span className="text-blue-400 font-mono">{systemVersion}</span>
        </div>
      </div>
    </aside>
  );
};

interface TopHeaderProps {
  activeTab: string;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  compliance: ComplianceValidation;
  crewCount?: { total: number; tw: number; foreign: number };
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  selectedMonth,
  setSelectedMonth,
  userRole,
  setUserRole,
  compliance,
  crewCount = { total: 46, tw: 30, foreign: 16 },
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'SCHEDULE': return '智慧自動排班與調度管理';
      case 'SAFETY': return '船舶法定最低安全配置矩陣';
      case 'CREW': return '船員適任證照與執勤履歷庫';
      case 'LEAVE': return userRole === 'CREW' ? '船員休假餘假與先選先得' : '休假審核與餘假管控';
      case 'WORKHOURS': return '出勤工時統計與合規稽核';
      case 'ALLOWANCES': return '各項津貼自動核算與追溯依據';
      case 'PAYROLL': return '全體船員月度薪資結算表與薪資單';
      case 'REPORTS': return '營運決策與人事業務統計報表';
      case 'SETTINGS': return '系統參數配置與異動審計日誌';
      default: return '船務管理控制台';
    }
  };

  const getTodayFormatted = () => {
    const today = new Date();
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return `${today.getFullYear()}年${String(today.getMonth() + 1).padStart(2, '0')}月${String(today.getDate()).padStart(2, '0')}日 (週${days[today.getDay()]})`;
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shrink-0 shadow-xs z-20">
      {/* Title & Path */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {getTabTitle()}
          </h1>
          <p className="text-[11px] text-slate-500 hidden md:block">
            智慧排班 ‧ 安全配置 ‧ 餘假審核 ‧ 工時津貼 ‧ 薪資結算
          </p>
        </div>
      </div>

      {/* Right Controls & Quick Badges */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Compliance Status Badge */}
        <div className={`status-badge ${compliance.isValid ? 'compliance-ok' : 'compliance-warn'}`}>
          {compliance.isValid ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>配置符合</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{compliance.errors.length} 項缺額/警示</span>
            </>
          )}
        </div>

        {/* Date Display */}
        <div className="hidden lg:block px-3 py-1 bg-slate-100 border border-slate-200/80 rounded text-xs font-medium text-slate-600">
          {getTodayFormatted()}
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <select
            id="header-month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="2026-09">2026年 09月</option>
            <option value="2026-08">2026年 08月</option>
            <option value="2026-10">2026年 10月</option>
          </select>
        </div>

        {/* Role Selector & Permission Info */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs">
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          <select
            id="header-role-select"
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as UserRole)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="CREW">本國船員 (Crew)</option>
            <option value="DISPATCHER">船務管理 / 船務調度 (Ship Management)</option>
            <option value="HR">人事與會計薪資 (HR / Payroll)</option>
            <option value="ADMIN">系統最高管理者 (Administrator)</option>
          </select>
        </div>

        {/* Nationality Crew Count Badges */}
        <div className="hidden sm:flex -space-x-1 items-center" title={`台籍船員 ${crewCount.tw} 人 / 外籍船員 ${crewCount.foreign} 人`}>
          <div className="w-7 h-7 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
            TW
          </div>
          <div className="w-7 h-7 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
            EN
          </div>
        </div>
      </div>
    </header>
  );
};

// Legacy Header wrapper for backward compatibility
export const Header: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  compliance: ComplianceValidation;
  pendingLeaveCount?: number;
}> = ({
  activeTab,
  setActiveTab,
  selectedMonth,
  setSelectedMonth,
  userRole,
  setUserRole,
  compliance,
  pendingLeaveCount = 0,
}) => {
  return (
    <TopHeader
      activeTab={activeTab}
      selectedMonth={selectedMonth}
      setSelectedMonth={setSelectedMonth}
      userRole={userRole}
      setUserRole={setUserRole}
      compliance={compliance}
    />
  );
};
