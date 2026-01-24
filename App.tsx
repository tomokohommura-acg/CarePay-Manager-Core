
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { MasterManager } from './components/MasterManager';
import { StaffInput } from './components/StaffInput';
import { StaffManager } from './components/StaffManager';
import { HistoryView } from './components/HistoryView';
import { StaffDashboard } from './components/StaffDashboard';
import { BusinessType, MasterData, Staff, StaffUpdateData, Office, HistoryEntry, EvaluationRecord, EvaluationPeriodMaster } from './types';
import { DEFAULT_MASTERS, INITIAL_STAFF, INITIAL_OFFICES } from './constants';

const STORAGE_KEY = 'carepay_v2_state';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'staff' | 'staff_list' | 'master' | 'history' | 'export'>('staff');
  const [offices, setOffices] = useState<Office[]>(INITIAL_OFFICES);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(offices[0].id);
  const [masters, setMasters] = useState<Record<BusinessType, MasterData>>(DEFAULT_MASTERS);
  const [staffList, setStaffList] = useState<Staff[]>(INITIAL_STAFF);
  
  // 入力データと評価用スナップショット (キーを "periodId_staffId" に拡張して管理)
  const [inputs, setInputs] = useState<Record<string, StaffUpdateData>>({});
  const [evaluationRecords, setEvaluationRecords] = useState<Record<string, EvaluationRecord>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  // 現在選択されている評価期間ID
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

  // ダッシュボード表示用
  const [viewingStaffId, setViewingStaffId] = useState<string | null>(null);

  // 初回ロード時: 選択中の事業所の最初の期間をセット
  useEffect(() => {
    const selectedOffice = offices.find(o => o.id === selectedOfficeId) || offices[0];
    const currentMaster = masters[selectedOffice.type];
    if (currentMaster.periods.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(currentMaster.periods[0].id);
    }
  }, [selectedOfficeId, masters, offices, selectedPeriodId]);

  // LocalStorageから復元
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.masters) setMasters(parsed.masters);
        if (parsed.staffList) setStaffList(parsed.staffList);
        if (parsed.inputs) setInputs(parsed.inputs);
        if (parsed.history) setHistory(parsed.history);
        if (parsed.evaluationRecords) setEvaluationRecords(parsed.evaluationRecords);
        if (parsed.offices) setOffices(parsed.offices);
        if (parsed.selectedPeriodId) setSelectedPeriodId(parsed.selectedPeriodId);
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  }, []);

  // 状態が変わるたびに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      masters, staffList, inputs, history, evaluationRecords, offices, selectedPeriodId
    }));
  }, [masters, staffList, inputs, history, evaluationRecords, offices, selectedPeriodId]);

  const selectedOffice = offices.find(o => o.id === selectedOfficeId) || offices[0];
  const businessType = selectedOffice.type;
  const currentMaster = masters[businessType];
  const activePeriod = currentMaster.periods.find(p => p.id === selectedPeriodId) || currentMaster.periods[0];

  // 現在の事業所 + 選択中の期間 に所属するスナップショットを抽出
  const recordKeyPrefix = `${selectedPeriodId}_`;
  const currentEvaluationRecords = (Object.values(evaluationRecords) as EvaluationRecord[])
    .filter(r => {
      const isCorrectOffice = r.officeId === selectedOfficeId;
      // evaluationRecordsのキー自体に期間情報が含まれている前提
      const isCorrectPeriod = Object.keys(evaluationRecords).find(key => evaluationRecords[key] === r)?.startsWith(recordKeyPrefix);
      return isCorrectOffice && isCorrectPeriod;
    });

  const dashboardRecord = viewingStaffId ? evaluationRecords[`${selectedPeriodId}_${viewingStaffId}`] : null;
  const dashboardInput = viewingStaffId ? (inputs[`${selectedPeriodId}_${viewingStaffId}`] || { staffId: viewingStaffId, periodId: selectedPeriodId, attendanceInputs: {}, performanceInputs: {} }) : null;

  const syncStaffFromMaster = () => {
    if (!selectedPeriodId) return alert("期間を選択してください");
    const officeStaff = staffList.filter(s => s.officeId === selectedOfficeId);
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

  const handleInputChange = (data: StaffUpdateData) => {
    const key = `${selectedPeriodId}_${data.staffId}`;
    setInputs(prev => ({ ...prev, [key]: data }));
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

    setHistory(prev => [newEntry, ...prev]);
    alert("評価を履歴に保存しました。");
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      offices={offices}
      selectedOfficeId={selectedOfficeId}
      setSelectedOfficeId={setSelectedOfficeId}
      periodConfig={activePeriod ? { evaluationStart: activePeriod.evaluationStart, evaluationEnd: activePeriod.evaluationEnd, paymentStart: activePeriod.paymentStart, paymentEnd: activePeriod.paymentEnd } : { evaluationStart: '', evaluationEnd: '', paymentStart: '', paymentEnd: '' }}
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
          onInputChange={handleInputChange}
          onSaveHistory={handleSaveToHistory}
          onSync={syncStaffFromMaster}
          onOpenDashboard={(id) => setViewingStaffId(id)}
        />
      )}

      {activeTab === 'staff_list' && (
        <StaffManager
          staffList={staffList}
          setStaffList={setStaffList}
          selectedOfficeId={selectedOfficeId}
          master={currentMaster}
        />
      )}
      
      {activeTab === 'master' && (
        <MasterManager 
          data={currentMaster} 
          onUpdate={handleUpdateMaster} 
          title={businessType === BusinessType.HOME_CARE ? '訪問介護' : '訪問看護'}
          businessType={businessType}
          offices={offices}
          setOffices={setOffices}
          selectedOfficeId={selectedOfficeId}
          setSelectedOfficeId={setSelectedOfficeId}
        />
      )}

      {activeTab === 'history' && (
        <HistoryView history={history} setHistory={setHistory} />
      )}

      {activeTab === 'export' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">📥</div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">CSVエクスポート</h3>
          <p className="text-slate-500 mb-8 leading-relaxed">
            <span className="font-bold text-indigo-600">{selectedOffice.name}</span><br/>
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

export default App;
