/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sidebar,
  TopHeader
} from './components/Header';
import { 
  VesselSafetyView 
} from './components/VesselSafetyView';
import { 
  CrewManagementView 
} from './components/CrewManagementView';
import { 
  AutoSchedulingView 
} from './components/AutoSchedulingView';
import { 
  CrewLeaveView 
} from './components/CrewLeaveView';
import { 
  WorkHoursView 
} from './components/WorkHoursView';
import { 
  AllowanceView 
} from './components/AllowanceView';
import { 
  PayrollView 
} from './components/PayrollView';
import { 
  AnalyticsReportsView 
} from './components/AnalyticsReportsView';
import { 
  AdminSettingsView 
} from './components/AdminSettingsView';

import { 
  initialVessels, 
  initialCrewMembers, 
  initialRoutes, 
  initialAllowanceRules, 
  initialLeaveRequests,
  initialAuditLogs
} from './data/initialData';

import { 
  Vessel, 
  CrewMember, 
  Route, 
  AllowanceRule, 
  LeaveRequest, 
  ScheduleEntry, 
  AuditLog, 
  UserRole,
  ComplianceValidation 
} from './types';

import { 
  generateAutoSchedule, 
  validateSchedules 
} from './services/schedulingEngine';

export default function App() {
  // Navigation & User Context
  const [activeTab, setActiveTab] = useState<string>('SCHEDULE');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [userRole, setUserRole] = useState<UserRole>('DISPATCHER');
  const [currentCrewId, setCurrentCrewId] = useState<string>('C-TW-01');

  // Core Datasets
  const [vessels, setVessels] = useState<Vessel[]>(initialVessels);
  const [crewList, setCrewList] = useState<CrewMember[]>(initialCrewMembers);
  const [routes, setRoutes] = useState<Route[]>(initialRoutes);
  const [allowanceRules, setAllowanceRules] = useState<AllowanceRule[]>(initialAllowanceRules);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);

  // Schedules state: Initialize with an intelligent auto-generated roster for the selected month
  const [schedules, setSchedules] = useState<ScheduleEntry[]>(() => {
    const auto = generateAutoSchedule('2026-09', initialVessels, initialCrewMembers, initialLeaveRequests);
    return auto.schedules;
  });

  // Re-generate schedules if month changes and no custom schedules exist
  useEffect(() => {
    const monthSchedules = schedules.filter(s => s.date.startsWith(selectedMonth));
    if (monthSchedules.length === 0) {
      const auto = generateAutoSchedule(selectedMonth, vessels, crewList, leaveRequests);
      setSchedules(prev => [...prev, ...auto.schedules]);
    }
  }, [selectedMonth]);

  // Real-time Compliance Checker
  const compliance: ComplianceValidation = useMemo(() => {
    return validateSchedules(schedules, vessels, crewList, leaveRequests, selectedMonth);
  }, [schedules, vessels, crewList, leaveRequests, selectedMonth]);

  // Audit Log Helper
  const handleAddAuditLog = (
    action: string,
    targetType: any,
    targetId: string,
    targetName: string,
    details: string
  ) => {
    const newLog: AuditLog = {
      id: 'LOG-' + Math.random().toString(36).substr(2, 7),
      timestamp: new Date().toISOString(),
      performedByRole: userRole,
      performedByName: userRole === 'ADMIN' ? '系統最高管理者' : userRole === 'DISPATCHER' ? '調度船務長' : '人事管理員',
      action,
      targetType,
      targetId,
      targetName,
      details,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Crew Handlers
  const handleAddCrew = (newCrew: CrewMember) => {
    setCrewList(prev => [...prev, newCrew]);
    handleAddAuditLog('CREATE', 'CREW', newCrew.id, newCrew.name, `新增船員基本資料與適任證書 (${newCrew.rankLevel})`);
  };

  const handleUpdateCrew = (updatedCrew: CrewMember) => {
    setCrewList(prev => prev.map(c => c.id === updatedCrew.id ? updatedCrew : c));
    handleAddAuditLog('UPDATE', 'CREW', updatedCrew.id, updatedCrew.name, `更新船員適任證書、固定船舶或基本底薪設定`);
  };

  // Leave Handlers
  const handleRequestLeave = (req: Partial<LeaveRequest>) => {
    const newLeave: LeaveRequest = {
      id: 'LR-' + Math.random().toString(36).substr(2, 6),
      crewId: req.crewId || currentCrewId,
      date: req.date || `${selectedMonth}-01`,
      type: req.type || 'MONTHLY_REST',
      reason: req.reason || '例行輪休',
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };
    setLeaveRequests(prev => [newLeave, ...prev]);
    const applicant = crewList.find(c => c.id === newLeave.crewId);
    handleAddAuditLog(
      'LEAVE_APPLY',
      'LEAVE',
      newLeave.id,
      applicant?.name || '船員',
      `船員申請【${newLeave.date}】休假預選 (先選先得順位保留)`
    );
  };

  const handleReviewLeave = (requestId: string, status: 'APPROVED' | 'REJECTED', comment?: string) => {
    setLeaveRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status,
          reviewComment: comment,
          reviewedAt: new Date().toISOString(),
          reviewedBy: userRole,
        };
      }
      return r;
    }));

    const targetReq = leaveRequests.find(r => r.id === requestId);
    if (targetReq && status === 'APPROVED') {
      // 若核准休假，將當日該船員之排班解除或更新
      setSchedules(prev => prev.map(s => {
        if (s.crewId === targetReq.crewId && s.date === targetReq.date) {
          return {
            ...s,
            status: 'CANCELLED',
            notes: `已核准休假 (${targetReq.type})`,
          };
        }
        return s;
      }));

      // 更新已休天數
      setCrewList(prev => prev.map(c => {
        if (c.id === targetReq.crewId) {
          return {
            ...c,
            takenMonthlyRestDays: c.takenMonthlyRestDays + 1,
          };
        }
        return c;
      }));
    }

    const applicant = crewList.find(c => c.id === targetReq?.crewId);
    handleAddAuditLog(
      status === 'APPROVED' ? 'LEAVE_APPROVE' : 'LEAVE_REJECT',
      'LEAVE',
      requestId,
      applicant?.name || '船員',
      `船務管理員審核【${applicant?.name}】${targetReq?.date} 休假申請 (${status === 'APPROVED' ? '准予休假' : '駁回申請'})`
    );
  };

  // Vessel Handlers
  const handleUpdateVessel = (updatedVessel: Vessel) => {
    setVessels(prev => prev.map(v => v.id === updatedVessel.id ? updatedVessel : v));
  };

  // Allowance Rules Handlers
  const handleUpdateAllowanceRules = (updatedRules: AllowanceRule[]) => {
    setAllowanceRules(updatedRules);
  };

  const pendingLeaveCount = useMemo(() => {
    return leaveRequests.filter(r => r.status === 'PENDING').length;
  }, [leaveRequests]);

  const currentCrewMember = crewList.find(c => c.id === currentCrewId) || crewList[0];

  const currentUserName = useMemo(() => {
    switch (userRole) {
      case 'ADMIN': return '系統最高管理者';
      case 'DISPATCHER': return '陳大文 (船務調度長)';
      case 'HR': return '林人事 (薪資專員)';
      case 'CREW': return `${currentCrewMember.name} (${currentCrewMember.role})`;
      default: return '系統用戶';
    }
  }, [userRole, currentCrewMember]);

  return (
    <div className="h-screen w-full bg-[#f8fafc] text-slate-800 flex overflow-hidden font-sans antialiased">
      {/* Professional Polish Dark Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        pendingLeaveCount={pendingLeaveCount}
        userName={currentUserName}
        systemVersion="v2.4.0-Enterprise"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <TopHeader
          activeTab={activeTab}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          userRole={userRole}
          setUserRole={setUserRole}
          compliance={compliance}
          crewCount={{
            total: crewList.length,
            tw: crewList.filter(c => c.nationality === 'TW').length,
            foreign: crewList.filter(c => c.nationality === 'FOREIGN').length,
          }}
        />

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#f8fafc]">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'SAFETY' && (
              <VesselSafetyView
                vessels={vessels}
                crewList={crewList}
                selectedMonth={selectedMonth}
                userRole={userRole}
                onNavigateToSchedule={() => setActiveTab('SCHEDULE')}
              />
            )}

            {activeTab === 'CREW' && (
              <CrewManagementView
                crewList={crewList}
                vessels={vessels}
                userRole={userRole}
                onAddCrew={handleAddCrew}
                onUpdateCrew={handleUpdateCrew}
              />
            )}

            {activeTab === 'SCHEDULE' && (
              <AutoSchedulingView
                selectedMonth={selectedMonth}
                vessels={vessels}
                crewList={crewList}
                leaveRequests={leaveRequests}
                schedules={schedules}
                compliance={compliance}
                userRole={userRole}
                currentCrewId={userRole === 'CREW' ? currentCrewId : undefined}
                onUpdateSchedules={(newScheds) => setSchedules(newScheds)}
                onAddAuditLog={handleAddAuditLog}
              />
            )}

            {activeTab === 'LEAVE' && (
              <CrewLeaveView
                currentCrew={currentCrewMember}
                allCrew={crewList}
                schedules={schedules}
                vessels={vessels}
                leaveRequests={leaveRequests}
                selectedMonth={selectedMonth}
                userRole={userRole}
                onRequestLeave={handleRequestLeave}
                onReviewLeave={handleReviewLeave}
              />
            )}

            {activeTab === 'WORKHOURS' && (
              <WorkHoursView
                crewList={crewList}
                schedules={schedules}
                leaveRequests={leaveRequests}
                vessels={vessels}
                routes={routes}
                selectedMonth={selectedMonth}
              />
            )}

            {activeTab === 'ALLOWANCES' && (
              <AllowanceView
                crewList={crewList}
                schedules={schedules}
                routes={routes}
                vessels={vessels}
                rules={allowanceRules}
                selectedMonth={selectedMonth}
              />
            )}

            {activeTab === 'PAYROLL' && (
              <PayrollView
                crewList={crewList}
                schedules={schedules}
                leaveRequests={leaveRequests}
                routes={routes}
                vessels={vessels}
                rules={allowanceRules}
                selectedMonth={selectedMonth}
              />
            )}

            {activeTab === 'REPORTS' && (
              <AnalyticsReportsView
                selectedMonth={selectedMonth}
                vessels={vessels}
                crewList={crewList}
                schedules={schedules}
                leaveRequests={leaveRequests}
                routes={routes}
                allowanceRules={allowanceRules}
              />
            )}

            {activeTab === 'SETTINGS' && (
              <AdminSettingsView
                vessels={vessels}
                allowanceRules={allowanceRules}
                auditLogs={auditLogs}
                onUpdateVessel={handleUpdateVessel}
                onUpdateAllowanceRules={handleUpdateAllowanceRules}
                onAddAuditLog={handleAddAuditLog}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
