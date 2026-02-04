import React, { useState, useEffect, useMemo } from 'react';
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
import {
  demoUser,
  demoOffices,
  demoStaffList,
  demoMasters,
  demoEvaluationRecords,
  demoInputs,
  demoHistory
} from './utils/demoData';

// デモモードかどうかを判定
const isDemoMode = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('demo') === 'true';
};

const AppContent: React.FC = () => {
  const demoMode = useMemo(() => isDemoMode(), []);
  const { appUser: realAppUser, loading: authLoading, logout: realLogout, isAdmin: realIsAdmin, canAccessOffice: realCanAccessOffice, canEditOffice: realCanEditOffice } = useAuth();

  // デモモード用のステート
  const [demoOfficesState, setDemoOfficesState] = useState(demoOffices);
  const [demoStaffListState, setDemoStaffListState] = useState(demoStaffList);
  const [demoMastersState, setDemoMastersState] = useState(demoMasters);
  const [demoEvaluationRecordsState, setDemoEvaluationRecordsState] = useState(demoEvaluationRecords);
  const [demoInputsState, setDemoInputsState] = useState(demoInputs);
  const [demoHistoryState, setDemoHistoryState] = useState(demoHistory);
  const [demoSelectedPeriodId, setDemoSelectedPeriodId] = useState('period-002');

  // デモモードか本番モードかで切り替え
  const appUser = demoMode ? demoUser : realAppUser;
  const isAuthenticated = demoMode ? true : !!realAppUser;
  const logout = demoMode ? () => { window.location.href = '/'; } : realLogout;
  const isAdmin = demoMode ? true : realIsAdmin;
  const canAccessOffice = demoMode ? () => true : realCanAccessOffice;
  const canEditOffice = demoMode ? () => true : realCanEditOffice;

  const {
    offices: firestoreOffices,
    staffList: firestoreStaffList,
    masters: firestoreMasters,
    evaluationRecords: firestoreEvaluationRecords,
    inputs: firestoreInputs,
    history: firestoreHistory,
    changeLogs,
    smarthrConfig,
    departmentMappings,
    qualificationMappings,
    selectedPeriodId: firestoreSelectedPeriodId,
    loading: dataLoading,
    setOffices: setFirestoreOffices,
    setStaffList: setFirestoreStaffList,
    setMasters: setFirestoreMasters,
    setEvaluationRecords: setFirestoreEvaluationRecords,
    setInputs: setFirestoreInputs,
    setHistory: setFirestoreHistory,
    setSmarthrConfig,
    setDepartmentMappings,
    setQualificationMappings,
    setSelectedPeriodId: setFirestoreSelectedPeriodId,
    handleInputChange: firestoreHandleInputChange,
    handleAddHistoryEntry: firestoreHandleAddHistoryEntry,
    handleAddChangeLog
  } = useFirestoreData(demoMode ? false : isAuthenticated);

  // デモモードか本番モードかでデータを切り替え
  const offices = demoMode ? demoOfficesState : firestoreOffices;
  const staffList = demoMode ? demoStaffListState : firestoreStaffList;
  const masters = demoMode ? demoMastersState : firestoreMasters;
  const evaluationRecords = demoMode ? demoEvaluationRecordsState : firestoreEvaluationRecords;
  const inputs = demoMode ? demoInputsState : firestoreInputs;
  const history = demoMode ? demoHistoryState : firestoreHistory;
  const selectedPeriodId = demoMode ? demoSelectedPeriodId : firestoreSelectedPeriodId;

  const setOffices = demoMode ? setDemoOfficesState : setFirestoreOffices;
  const setStaffList = demoMode ? setDemoStaffListState : setFirestoreStaffList;
  const setMasters = demoMode ? setDemoMastersState : setFirestoreMasters;
  const setEvaluationRecords = demoMode ? setDemoEvaluationRecordsState : setFirestoreEvaluationRecords;
  const setInputs = demoMode ? setDemoInputsState : setFirestoreInputs;
  const setHistory = demoMode ? setDemoHistoryState : setFirestoreHistory;
  const setSelectedPeriodId = demoMode ? setDemoSelectedPeriodId : setFirestoreSelectedPeriodId;

  const handleInputChange = demoMode
    ? (data: StaffUpdateData) => {
        const key = `${data.periodId}_${data.staffId}`;
        setDemoInputsState(prev => ({ ...prev, [key]: data }));
      }
    : firestoreHandleInputChange;

  const handleAddHistoryEntry = demoMode
    ? (entry: HistoryEntry) => {
        setDemoHistoryState(prev => [entry, ...prev]);
      }
    : firestoreHandleAddHistoryEntry;

  const [activeTab, setActiveTab] = useState<TabType>('staff');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [exportPeriodId, setExportPeriodId] = useState<string>('');

  // アクセス可能な事業所のみをフィルタリング（デモモードでは全事業所）
  const accessibleOffices = demoMode ? offices : offices.filter(o => canAccessOffice(o.id));
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showUnconfiguredOnly, setShowUnconfiguredOnly] = useState(false);
  const [viewingStaffId, setViewingStaffId] = useState<string | null>(null);

  // 初回ロード時: 最初のアクセス可能な事業所を選択
  useEffect(() => {
    if (accessibleOffices.length > 0 && !selectedOfficeId) {
      setSelectedOfficeId(accessibleOffices[0].id);
    }
    // 選択中の事業所にアクセスできなくなった場合、リセット
    if (selectedOfficeId && !canAccessOffice(selectedOfficeId) && accessibleOffices.length > 0) {
      setSelectedOfficeId(accessibleOffices[0].id);
    }
  }, [accessibleOffices, selectedOfficeId, canAccessOffice]);

  useEffect(() => {
    const selectedOffice = accessibleOffices.find(o => o.id === selectedOfficeId) || accessibleOffices[0];
    if (selectedOffice) {
      const currentMaster = masters[selectedOffice.type];
      if (currentMaster?.periods?.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(currentMaster.periods[0].id);
      }
    }
  }, [selectedOfficeId, masters, accessibleOffices, selectedPeriodId, setSelectedPeriodId]);

  // 認証ローディング中（デモモードではスキップ）
  if (!demoMode && authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未認証時はログイン画面（デモモードではスキップ）
  if (!demoMode && !isAuthenticated) {
    return <LoginPage />;
  }

  // データローディング中（デモモードではスキップ）
  if (!demoMode && dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  // 「全事業所」選択時は最初の事業所をフォールバックとして使用
  const isAllOfficesSelected = selectedOfficeId === 'all';
  const selectedOffice = isAllOfficesSelected
    ? accessibleOffices[0]
    : (accessibleOffices.find(o => o.id === selectedOfficeId) || accessibleOffices[0]);

  if (!selectedOffice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">アクセス可能な事業所がありません</p>
      </div>
    );
  }

  const businessType = selectedOffice.type;
  const currentMaster = masters[businessType];
  const activePeriod = currentMaster?.periods?.find(p => p.id === selectedPeriodId) || currentMaster?.periods?.[0];

  // 選択中の事業所に対する編集権限（全事業所モードでは編集不可）
  const canEditCurrentOffice = isAllOfficesSelected ? false : canEditOffice(selectedOfficeId);

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
    <>
      {/* デモモードバナー */}
      {demoMode && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-bold fixed top-0 left-0 right-0 z-50">
          デモモード - サンプルデータで動作中（データは保存されません）
          <a href="/" className="ml-4 underline hover:no-underline">通常モードへ</a>
        </div>
      )}
      <div className={demoMode ? 'pt-10' : ''}>
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      offices={accessibleOffices}
      selectedOfficeId={selectedOfficeId}
      setSelectedOfficeId={setSelectedOfficeId}
      periodConfig={activePeriod ? { evaluationStart: activePeriod.evaluationStart, evaluationEnd: activePeriod.evaluationEnd, paymentStart: activePeriod.paymentStart, paymentEnd: activePeriod.paymentEnd } : { evaluationStart: '', evaluationEnd: '', paymentStart: '', paymentEnd: '' }}
      user={appUser}
      onLogout={logout}
      isAdmin={isAdmin}
      canEdit={canEditCurrentOffice}
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
        isAllOfficesSelected ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">事業所を選択してください</h3>
            <p className="text-slate-500">
              評価データ入力簿は事業所ごとのマスタ設定を使用するため、<br />
              「全事業所」モードでは表示できません。
            </p>
            <p className="text-slate-400 text-sm mt-4">
              サイドバーから特定の事業所を選択してください。
            </p>
          </div>
        ) : (
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
            canEdit={canEditCurrentOffice}
          />
        )
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
          canEdit={canEditCurrentOffice}
        />
      )}

      {activeTab === 'analytics' && (
        <StaffAnalytics
          staffList={staffList}
          offices={isAdmin ? offices : accessibleOffices}
          masters={masters}
          history={history}
          selectedOfficeId={selectedOfficeId}
          isAllOfficesMode={isAllOfficesSelected}
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
        <UserManagement currentUser={appUser} offices={offices} />
      )}

      {activeTab === 'export' && (() => {
        const currentExportPeriodId = exportPeriodId || selectedPeriodId;
        const exportPeriod = currentMaster?.periods?.find(p => p.id === currentExportPeriodId);

        // エクスポート用の評価レコードを取得
        const exportRecords = (Object.values(evaluationRecords) as EvaluationRecord[])
          .filter(r => {
            const isCorrectOffice = r.officeId === selectedOfficeId;
            const isCorrectPeriod = Object.keys(evaluationRecords).find(key => evaluationRecords[key] === r)?.startsWith(`${currentExportPeriodId}_`);
            return isCorrectOffice && isCorrectPeriod;
          });

        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-[#00c4cc]/10 text-[#00c4cc] rounded-full flex items-center justify-center text-3xl mx-auto mb-6">📥</div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">CSVエクスポート</h3>
              <p className="text-slate-500">
                <span className="font-bold text-[#00c4cc]">{selectedOffice.name}</span> の評価結果を出力します。
              </p>
            </div>

            {/* 期間選択 */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-2">評価期間 - 給与支払対象期間</label>
              <select
                value={currentExportPeriodId}
                onChange={(e) => setExportPeriodId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00c4cc] focus:border-[#00c4cc]"
              >
                {currentMaster?.periods?.map(period => (
                  <option key={period.id} value={period.id}>
                    {period.name}（評価: {period.evaluationStart}〜{period.evaluationEnd} / 支払: {period.paymentStart}〜{period.paymentEnd}）
                  </option>
                ))}
              </select>
            </div>

            {/* プレビュー情報 */}
            <div className="bg-slate-50 rounded-xl p-4 mb-8">
              <div className="text-sm text-slate-600">
                <div className="flex justify-between mb-2">
                  <span>対象職員数:</span>
                  <span className="font-bold">{exportRecords.length}名</span>
                </div>
                <div className="flex justify-between">
                  <span>選択中の期間:</span>
                  <span className="font-bold">{exportPeriod?.name || '-'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!exportPeriod) return;

                // CSV出力用のデータを作成
                const csvRows: string[] = [];

                // ヘッダー行
                csvRows.push(['社員番号', '氏名', '基本給与', '資格手当', '正規給与', '減額合計', '評価合計', '特別加減算', '最終支給額（新給与）', '旧給与', '差分'].join(','));

                // データ行
                exportRecords.forEach(record => {
                  const key = `${currentExportPeriodId}_${record.staffId}`;
                  const input = inputs[key] || { attendanceInputs: {}, performanceInputs: {}, staffId: record.staffId, periodId: currentExportPeriodId };
                  const staff = staffList.find(s => s.id === record.staffId);

                  // 資格手当計算
                  const applicableQuals = record.qualifications
                    .map(qId => currentMaster.qualifications.find(mq => mq.id === qId))
                    .filter((q): q is typeof currentMaster.qualifications[0] => !!q)
                    .sort((a, b) => a.priority - b.priority);
                  const qualAllowances = applicableQuals.length > 0 ? applicableQuals[0].allowance : 0;

                  // 正規給与
                  const regularSalary = record.baseSalary + qualAllowances;

                  // 減額合計
                  let totalDeduction = 0;
                  currentMaster.attendanceConditions.forEach(cond => {
                    totalDeduction += (input.attendanceInputs[cond.id] || 0) * cond.unitAmount;
                  });

                  // 評価合計
                  let totalPerformance = 0;
                  currentMaster.performanceEvaluations.forEach(pe => {
                    totalPerformance += (input.performanceInputs[pe.id] || 0) * pe.unitAmount;
                  });

                  // 特別加減算
                  const netAdjustment = totalPerformance - totalDeduction;

                  // 最終支給額（新給与）
                  const updatedSalary = regularSalary + netAdjustment;

                  // 旧給与・差分
                  const previousSalary = record.previousSalary || 0;
                  const diff = previousSalary > 0 ? previousSalary - updatedSalary : '';

                  csvRows.push([
                    staff?.smarthrEmpCode || '',
                    record.name,
                    record.baseSalary,
                    qualAllowances,
                    regularSalary,
                    totalDeduction,
                    totalPerformance,
                    netAdjustment,
                    updatedSalary,
                    previousSalary || '',
                    diff
                  ].join(','));
                });

                // BOM付きUTF-8でCSV作成
                const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
                const blob = new Blob([bom, csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${selectedOffice.name}_${exportPeriod.name}_評価結果.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              disabled={exportRecords.length === 0}
              className="w-full bg-[#00c4cc] text-white py-4 rounded-xl font-bold hover:bg-[#00a8b0] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CSVファイルをダウンロード ({exportRecords.length}名)
            </button>
          </div>
        );
      })()}
    </Layout>
      </div>
    </>
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
