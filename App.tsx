import React, { useState, useEffect } from 'react';
import { Layout, TabType } from './components/Layout';
import { LoginPage } from './components/LoginPage';
import { MasterManager } from './components/MasterManager';
import { StaffInput } from './components/StaffInput';
import { StaffManager } from './components/StaffManager';
import { HistoryView } from './components/HistoryView';
import { StaffDashboard } from './components/StaffDashboard';
import { SmartHRSettings } from './components/SmartHRSettings';
import { SmartHRSyncDialog } from './components/SmartHRSyncDialog';
import { UserManagement } from './components/UserManagement';
import { StaffAnalytics } from './components/StaffAnalytics';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useFirestoreData } from './hooks/useFirestoreData';
import { BusinessType, MasterData, StaffUpdateData, HistoryEntry, EvaluationRecord, ChangeLogEntry, ChangeDetail } from './types';

const AppContent: React.FC = () => {
  const { appUser, loading: authLoading, logout, isAdmin, isEvaluator, canEdit } = useAuth();
  const isAuthenticated = !!appUser;

  const {
    offices,
    staffList,
    masters,
    evaluationRecords,
    inputs,
    history,
    changeLogs,
    smarthrConfig,
    departmentMappings,
    qualificationMappings,
    selectedPeriodId,
    loading: dataLoading,
    setOffices,
    setStaffList,
    setMasters,
    setEvaluationRecords,
    setInputs,
    setHistory,
    setSmarthrConfig,
    setDepartmentMappings,
    setQualificationMappings,
    setSelectedPeriodId,
    handleInputChange,
    handleAddHistoryEntry,
    handleAddChangeLog
  } = useFirestoreData(isAuthenticated);

  const [activeTab, setActiveTab] = useState<TabType>('staff');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showUnconfiguredOnly, setShowUnconfiguredOnly] = useState(false);
  const [viewingStaffId, setViewingStaffId] = useState<string | null>(null);

  // 初回ロード時: 最初の事業所と期間を選択
  useEffect(() => {
    if (offices.length > 0 && !selectedOfficeId) {
      setSelectedOfficeId(offices[0].id);
    }
  }, [offices, selectedOfficeId]);

  useEffect(() => {
    const selectedOffice = offices.find(o => o.id === selectedOfficeId) || offices[0];
    if (selectedOffice) {
      const currentMaster = masters[selectedOffice.type];
      if (currentMaster?.periods?.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(currentMaster.periods[0].id);
      }
    }
  }, [selectedOfficeId, masters, offices, selectedPeriodId, setSelectedPeriodId]);

  // 認証ローディング中
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未認証時はログイン画面
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // データローディング中
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  const selectedOffice = offices.find(o => o.id === selectedOfficeId) || offices[0];
  if (!selectedOffice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">事業所データがありません</p>
      </div>
    );
  }

  const businessType = selectedOffice.type;
  const currentMaster = masters[businessType];
  const activePeriod = currentMaster?.periods?.find(p => p.id === selectedPeriodId) || currentMaster?.periods?.[0];

  // 現在の事業所 + 選択中の期間 に所属するスナップショットを抽出
  const recordKeyPrefix = `${selectedPeriodId}_`;
  const evaluationStartDate = activePeriod?.evaluationStart ? new Date(activePeriod.evaluationStart + '-01') : null;

  const currentEvaluationRecords = (Object.values(evaluationRecords) as EvaluationRecord[])
    .filter(r => {
      const isCorrectOffice = r.officeId === selectedOfficeId;
      const isCorrectPeriod = Object.keys(evaluationRecords).find(key => evaluationRecords[key] === r)?.startsWith(recordKeyPrefix);

      const staff = staffList.find(s => s.id === r.staffId);
      if (staff?.resignedAt && evaluationStartDate) {
        const resignedDate = new Date(staff.resignedAt);
        if (resignedDate < evaluationStartDate) return false;
      }

      return isCorrectOffice && isCorrectPeriod;
    });

  const dashboardRecord = viewingStaffId ? evaluationRecords[`${selectedPeriodId}_${viewingStaffId}`] : null;
  const dashboardInput = viewingStaffId ? (inputs[`${selectedPeriodId}_${viewingStaffId}`] || { staffId: viewingStaffId, periodId: selectedPeriodId, attendanceInputs: {}, performanceInputs: {} }) : null;

  const syncStaffFromMaster = () => {
    if (!selectedPeriodId) return alert("期間を選択してください");
    if (!activePeriod) return alert("評価期間が設定されていません");

    const evaluationStartDate = activePeriod.evaluationStart ? new Date(activePeriod.evaluationStart + '-01') : null;

    const officeStaff = staffList.filter(s => {
      if (s.officeId !== selectedOfficeId) return false;
      if (s.resignedAt && evaluationStartDate) {
        const resignedDate = new Date(s.resignedAt);
        if (resignedDate < evaluationStartDate) return false;
      }
      return true;
    });

    let addedCount = 0;

    setEvaluationRecords(prev => {
      const newRecords = { ...prev };
      officeStaff.forEach(staff => {
        const key = `${selectedPeriodId}_${staff.id}`;
        if (!newRecords[key]) {
          newRecords[key] = {
            staffId: staff.id,
            officeId: staff.officeId,
            name: staff.name,
            baseSalary: staff.baseSalary,
            qualifications: [...staff.qualifications],
            previousSalary: staff.previousSalary
          };
          addedCount++;
        }
      });
      return newRecords;
    });

    if (addedCount > 0) alert(`${addedCount}名の職員をこの期間の評価対象に追加しました。`);
    else alert("追加が必要な新規職員はいませんでした。");
  };

  const handleUpdateMaster = (updated: MasterData) => {
    setMasters(prev => ({ ...prev, [businessType]: updated }));
  };

  const handleLocalInputChange = (data: StaffUpdateData) => {
    handleInputChange(data);
  };

  // 変更ログを生成するヘルパー関数
  const generateChangeLog = (
    previousInputs: Record<string, StaffUpdateData>,
    currentInputs: Record<string, StaffUpdateData>
  ): ChangeDetail[] => {
    const changes: ChangeDetail[] = [];

    // 現在の期間のキーのみをチェック
    const relevantKeys = Object.keys(currentInputs).filter(key => key.startsWith(`${selectedPeriodId}_`));

    for (const key of relevantKeys) {
      const current = currentInputs[key];
      const previous = previousInputs[key];
      const staffId = current.staffId;
      const staff = staffList.find(s => s.id === staffId);
      const staffName = staff?.name || '不明';

      if (!previous) {
        // 新規追加の場合は全項目を記録
        for (const [condId, value] of Object.entries(current.attendanceInputs)) {
          if (value !== 0) {
            const condition = currentMaster?.attendanceConditions?.find(c => c.id === condId);
            changes.push({
              staffId,
              staffName,
              field: `attendance_${condId}`,
              fieldName: condition?.name || condId,
              oldValue: 0,
              newValue: value
            });
          }
        }
        for (const [perfId, value] of Object.entries(current.performanceInputs)) {
          if (value !== 0) {
            const perf = currentMaster?.performanceEvaluations?.find(p => p.id === perfId);
            changes.push({
              staffId,
              staffName,
              field: `performance_${perfId}`,
              fieldName: perf?.name || perfId,
              oldValue: 0,
              newValue: value
            });
          }
        }
      } else {
        // 既存データとの差分をチェック
        for (const [condId, value] of Object.entries(current.attendanceInputs)) {
          const oldValue = previous.attendanceInputs[condId] || 0;
          if (oldValue !== value) {
            const condition = currentMaster?.attendanceConditions?.find(c => c.id === condId);
            changes.push({
              staffId,
              staffName,
              field: `attendance_${condId}`,
              fieldName: condition?.name || condId,
              oldValue,
              newValue: value
            });
          }
        }
        for (const [perfId, value] of Object.entries(current.performanceInputs)) {
          const oldValue = previous.performanceInputs[perfId] || 0;
          if (oldValue !== value) {
            const perf = currentMaster?.performanceEvaluations?.find(p => p.id === perfId);
            changes.push({
              staffId,
              staffName,
              field: `performance_${perfId}`,
              fieldName: perf?.name || perfId,
              oldValue,
              newValue: value
            });
          }
        }
      }
    }

    return changes;
  };

  const handleSaveToHistory = () => {
    if (!activePeriod) return;
    const confirmSave = window.confirm(`「${activePeriod.name}」の評価を確定し、履歴に保存しますか？`);
    if (!confirmSave) return;

    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      officeId: selectedOfficeId,
      officeName: selectedOffice.name,
      timestamp: new Date().toLocaleString(),
      period: { ...activePeriod },
      masterSnapshot: JSON.parse(JSON.stringify(currentMaster)),
      recordsSnapshot: JSON.parse(JSON.stringify(evaluationRecords)),
      inputs: JSON.parse(JSON.stringify(inputs)),
    };

    handleAddHistoryEntry(newEntry);

    // 変更ログを作成
    const lastHistoryForPeriod = history.find(h => h.period.id === activePeriod.id && h.officeId === selectedOfficeId);
    const previousInputs = lastHistoryForPeriod?.inputs || {};
    const changes = generateChangeLog(previousInputs, inputs);

    if (changes.length > 0 && appUser) {
      const changeLogEntry: ChangeLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userId: appUser.uid,
        userName: appUser.displayName,
        periodId: activePeriod.id,
        periodName: activePeriod.name,
        changes
      };
      handleAddChangeLog(changeLogEntry);
    }

    alert("評価を履歴に保存しました。");
  };

  const handleNavigateToStaffList = (showUnconfigured: boolean) => {
    setActiveTab('staff_list');
    setShowUnconfiguredOnly(showUnconfigured);
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      offices={offices}
      selectedOfficeId={selectedOfficeId}
      setSelectedOfficeId={setSelectedOfficeId}
      periodConfig={activePeriod ? { evaluationStart: activePeriod.evaluationStart, evaluationEnd: activePeriod.evaluationEnd, paymentStart: activePeriod.paymentStart, paymentEnd: activePeriod.paymentEnd } : { evaluationStart: '', evaluationEnd: '', paymentStart: '', paymentEnd: '' }}
      user={appUser}
      onLogout={logout}
      isAdmin={isAdmin}
      canEdit={canEdit}
    >
      {viewingStaffId && dashboardRecord && dashboardInput && (
        <StaffDashboard
          record={dashboardRecord}
          master={currentMaster}
          input={dashboardInput}
          history={history}
          onClose={() => setViewingStaffId(null)}
        />
      )}

      {activeTab === 'staff' && (
        <StaffInput
          records={currentEvaluationRecords}
          master={currentMaster}
          inputs={inputs}
          selectedPeriodId={selectedPeriodId}
          onPeriodChange={setSelectedPeriodId}
          onInputChange={handleLocalInputChange}
          onSaveHistory={handleSaveToHistory}
          onSync={syncStaffFromMaster}
          onOpenDashboard={(id) => setViewingStaffId(id)}
          canEdit={canEdit}
        />
      )}

      {activeTab === 'staff_list' && (
        <StaffManager
          staffList={staffList}
          setStaffList={setStaffList}
          selectedOfficeId={selectedOfficeId}
          master={currentMaster}
          onOpenSyncDialog={() => setShowSyncDialog(true)}
          smarthrConfigured={!!smarthrConfig.subdomain && !!smarthrConfig.accessToken}
          showUnconfiguredOnly={showUnconfiguredOnly}
          setShowUnconfiguredOnly={setShowUnconfiguredOnly}
          canEdit={canEdit}
        />
      )}

      {activeTab === 'analytics' && (
        <StaffAnalytics
          staffList={staffList}
          offices={offices}
          masters={masters}
          history={history}
        />
      )}

      {activeTab === 'smarthr_settings' && isAdmin && (
        <SmartHRSettings
          config={smarthrConfig}
          setConfig={setSmarthrConfig}
          departmentMappings={departmentMappings}
          setDepartmentMappings={setDepartmentMappings}
          qualificationMappings={qualificationMappings}
          setQualificationMappings={setQualificationMappings}
          offices={offices}
          masters={masters}
        />
      )}

      <SmartHRSyncDialog
        isOpen={showSyncDialog}
        onClose={() => setShowSyncDialog(false)}
        config={smarthrConfig}
        setConfig={setSmarthrConfig}
        departmentMappings={departmentMappings}
        qualificationMappings={qualificationMappings}
        offices={offices}
        masters={masters}
        staffList={staffList}
        setStaffList={setStaffList}
        onNavigateToStaffList={handleNavigateToStaffList}
      />

      {activeTab === 'master' && isAdmin && (
        <MasterManager
          data={currentMaster}
          onUpdate={handleUpdateMaster}
          title={businessType === BusinessType.HOME_CARE ? '訪問介護' : '訪問看護'}
          businessType={businessType}
          offices={offices}
          setOffices={setOffices}
          selectedOfficeId={selectedOfficeId}
          setSelectedOfficeId={setSelectedOfficeId}
          smarthrConfig={smarthrConfig}
          departmentMappings={departmentMappings}
          setDepartmentMappings={setDepartmentMappings}
        />
      )}

      {activeTab === 'history' && (
        <HistoryView
          history={history}
          setHistory={setHistory}
          changeLogs={changeLogs}
        />
      )}

      {activeTab === 'user_management' && isAdmin && appUser && (
        <UserManagement currentUser={appUser} />
      )}

      {activeTab === 'export' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">📥</div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">CSVエクスポート</h3>
          <p className="text-slate-500 mb-8 leading-relaxed">
            <span className="font-bold text-indigo-600">{selectedOffice.name}</span><br />
            期間: <span className="font-bold">{activePeriod?.name}</span> の評価結果を出力します。
          </p>
          <button onClick={() => alert("エクスポート機能は現在、期間別フィルタリングを適用中です")} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 shadow-lg">
            CSVファイルをダウンロード
          </button>
        </div>
      )}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
