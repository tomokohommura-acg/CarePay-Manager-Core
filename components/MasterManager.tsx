
import React, { useState } from 'react';
import { MasterData, QualificationMaster, AttendanceConditionMaster, PerformanceEvaluationMaster, Office, BusinessType, EvaluationPeriodMaster } from '../types';

interface MasterManagerProps {
  data: MasterData;
  onUpdate: (updated: MasterData) => void;
  title: string;
  businessType: BusinessType;
  offices: Office[];
  setOffices: React.Dispatch<React.SetStateAction<Office[]>>;
  selectedOfficeId: string;
  setSelectedOfficeId: (id: string) => void;
}

type DeleteTarget = {
  id: string;
  type: 'qual' | 'attend' | 'perf' | 'office' | 'period';
  name: string;
} | null;

export const MasterManager: React.FC<MasterManagerProps> = ({ 
  data, 
  onUpdate, 
  title,
  businessType,
  offices,
  setOffices,
  selectedOfficeId,
  setSelectedOfficeId
}) => {
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  
  const handleUpdatePeriod = (id: string, field: keyof EvaluationPeriodMaster, value: any) => {
    onUpdate({
      ...data,
      periods: data.periods.map(p => p.id === id ? { ...p, [field]: value } : p)
    });
  };

  const handleAddPeriod = () => {
    onUpdate({
      ...data,
      periods: [...data.periods, { 
        id: crypto.randomUUID(), 
        name: '新しい評価期間', 
        evaluationStart: '', 
        evaluationEnd: '', 
        paymentStart: '', 
        paymentEnd: '',
        status: 'editing'
      }]
    });
  };

  const handleUpdateQual = (id: string, field: keyof QualificationMaster, value: any) => {
    onUpdate({
      ...data,
      qualifications: data.qualifications.map(q => q.id === id ? { ...q, [field]: value } : q)
    });
  };

  const handleAddQual = () => {
    const maxPriority = data.qualifications.reduce((max, q) => Math.max(max, q.priority), 0);
    onUpdate({
      ...data,
      qualifications: [...data.qualifications, { id: crypto.randomUUID(), name: '新資格', allowance: 0, priority: maxPriority + 1 }]
    });
  };

  const handleUpdateAttend = (id: string, field: keyof AttendanceConditionMaster, value: any) => {
    onUpdate({
      ...data,
      attendanceConditions: data.attendanceConditions.map(a => a.id === id ? { ...a, [field]: value } : a)
    });
  };

  const handleAddAttend = () => {
    onUpdate({
      ...data,
      attendanceConditions: [...data.attendanceConditions, { id: crypto.randomUUID(), name: '新条件', unitAmount: 0, unitLabel: '回' }]
    });
  };

  const handleUpdatePerf = (id: string, field: keyof PerformanceEvaluationMaster, value: any) => {
    onUpdate({
      ...data,
      performanceEvaluations: data.performanceEvaluations.map(p => p.id === id ? { ...p, [field]: value } : p)
    });
  };

  const handleAddPerf = () => {
    onUpdate({
      ...data,
      performanceEvaluations: [...data.performanceEvaluations, { id: crypto.randomUUID(), name: '新評価項目', unitAmount: 0, unitLabel: '回' }]
    });
  };

  const handleAddOffice = () => {
    const newOffice: Office = {
      id: crypto.randomUUID(),
      name: businessType === BusinessType.HOME_CARE ? '新規訪問介護事業所' : '新規訪問看護ステーション',
      type: businessType
    };
    setOffices(prev => [...prev, newOffice]);
    setSelectedOfficeId(newOffice.id);
  };

  const handleUpdateOfficeName = (id: string, name: string) => {
    setOffices(prev => prev.map(o => o.id === id ? { ...o, name } : o));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { id, type } = deleteTarget;
    if (type === 'qual') onUpdate({ ...data, qualifications: data.qualifications.filter(q => q.id !== id) });
    else if (type === 'attend') onUpdate({ ...data, attendanceConditions: data.attendanceConditions.filter(a => a.id !== id) });
    else if (type === 'perf') onUpdate({ ...data, performanceEvaluations: data.performanceEvaluations.filter(p => p.id !== id) });
    else if (type === 'period') onUpdate({ ...data, periods: data.periods.filter(p => p.id !== id) });
    else if (type === 'office') {
      if (offices.length <= 1) {
        alert("最後の1つの事業所は削除できません。");
        setDeleteTarget(null);
        return;
      }
      const updated = offices.filter(o => o.id !== id);
      setOffices(updated);
      if (selectedOfficeId === id) setSelectedOfficeId(updated[0].id);
    }
    setDeleteTarget(null);
  };

  const filteredOffices = offices.filter(o => o.type === businessType);
  const isHomeCare = businessType === BusinessType.HOME_CARE;

  return (
    <div className="space-y-12 pb-20 relative">
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in duration-200 text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
            <h4 className="text-xl font-bold text-slate-800 mb-2">削除しますか？</h4>
            <p className="text-slate-500 text-sm mb-8">「{deleteTarget.name}」を削除します。</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100">キャンセル</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-rose-500 shadow-lg shadow-rose-200">削除する</button>
            </div>
          </div>
        </div>
      )}

      {/* 1. 事業所リスト (一番上に移動) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">🏢 {title}事業所リスト</h3>
          <button onClick={handleAddOffice} className={`text-sm px-4 py-2 rounded-xl font-bold text-white shadow-md ${isHomeCare ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>+ 新規事業所を追加</button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto custom-scrollbar">
            {filteredOffices.map(office => (
              <div key={office.id} className={`flex items-center px-6 py-4 gap-4 ${selectedOfficeId === office.id ? (isHomeCare ? 'bg-orange-50/40' : 'bg-blue-50/40') : 'hover:bg-slate-50'}`}>
                <input 
                  type="text" 
                  value={office.name} 
                  onChange={(e) => handleUpdateOfficeName(office.id, e.target.value)} 
                  className="flex-1 bg-transparent border-none text-sm font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-100 rounded p-1" 
                />
                <button 
                  onClick={() => setDeleteTarget({ id: office.id, type: 'office', name: office.name })} 
                  className="text-slate-300 hover:text-rose-500 transition-colors"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. 評価期間マスタ */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">📅 評価期間マスタ</h3>
          <button onClick={handleAddPeriod} className="text-sm px-4 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md">+ 期間を追加</button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">ステータス</th>
                <th className="px-6 py-4">期間名</th>
                <th className="px-6 py-4">評価対象期間</th>
                <th className="px-6 py-4">給与反映期間</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.periods.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/30">
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleUpdatePeriod(p.id, 'status', p.status === 'editing' ? 'locked' : 'editing')}
                      className={`text-[10px] font-black px-3 py-1.5 rounded-full transition-all border flex items-center gap-1.5 ${
                        p.status === 'locked' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      }`}
                    >
                      <span>{p.status === 'locked' ? '🔒' : '✏️'}</span>
                      {p.status === 'locked' ? '確定済み' : '評価中'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      value={p.name} 
                      onChange={(e) => handleUpdatePeriod(p.id, 'name', e.target.value)} 
                      className="w-full bg-transparent font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-100 p-1 rounded" 
                    />
                  </td>
                  <td className="px-6 py-4 flex gap-1 items-center">
                    <input type="month" value={p.evaluationStart} onChange={(e) => handleUpdatePeriod(p.id, 'evaluationStart', e.target.value)} className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-xs" />
                    <span>~</span>
                    <input type="month" value={p.evaluationEnd} onChange={(e) => handleUpdatePeriod(p.id, 'evaluationEnd', e.target.value)} className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-xs" />
                  </td>
                  <td className="px-6 py-4 flex gap-1 items-center">
                    <input type="month" value={p.paymentStart} onChange={(e) => handleUpdatePeriod(p.id, 'paymentStart', e.target.value)} className="bg-indigo-50 border border-indigo-100 rounded px-1 py-0.5 text-xs font-bold text-indigo-700" />
                    <span>~</span>
                    <input type="month" value={p.paymentEnd} onChange={(e) => handleUpdatePeriod(p.id, 'paymentEnd', e.target.value)} className="bg-indigo-50 border border-indigo-100 rounded px-1 py-0.5 text-xs font-bold text-indigo-700" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setDeleteTarget({ id: p.id, type: 'period', name: p.name })} className="text-slate-300 hover:text-rose-500 transition-colors">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. 資格・条件・評価マスタのグリッド */}
      <div className="grid grid-cols-1 gap-12">
        {/* 資格マスタ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">🎖️ 資格マスタ</h3>
            <button onClick={handleAddQual} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">+ 資格を追加</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4 w-20">優先度</th>
                  <th className="px-6 py-4">資格名</th>
                  <th className="px-6 py-4 text-right">手当額</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...data.qualifications].sort((a,b) => a.priority - b.priority).map(q => (
                  <tr key={q.id} className="hover:bg-slate-50/30">
                    <td className="px-6 py-4">
                      <input type="number" value={q.priority} onChange={(e) => handleUpdateQual(q.id, 'priority', Number(e.target.value))} className="w-12 text-center bg-slate-50 border border-slate-100 rounded p-1 font-bold text-indigo-600" />
                    </td>
                    <td className="px-6 py-4">
                      <input type="text" value={q.name} onChange={(e) => handleUpdateQual(q.id, 'name', e.target.value)} className="w-full bg-transparent outline-none font-medium p-1 focus:ring-1 focus:ring-indigo-100 rounded" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-slate-400">¥</span>
                      <input type="number" value={q.allowance} onChange={(e) => handleUpdateQual(q.id, 'allowance', Number(e.target.value))} className="w-20 text-right bg-transparent outline-none font-bold text-indigo-600 p-1 focus:ring-1 focus:ring-indigo-100 rounded" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setDeleteTarget({ id: q.id, type: 'qual', name: q.name })} className="text-slate-300 hover:text-rose-500 transition-colors">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 減額・加算マスタの2カラムレイアウト */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 出勤条件減額マスタ */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 text-rose-600">📉 出勤条件減額マスタ</h3>
              <button onClick={handleAddAttend} className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">+ 追加</button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500">
                  <tr>
                    <th className="px-6 py-4">項目名</th>
                    <th className="px-6 py-4 text-right">単価(減額)</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.attendanceConditions.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/30">
                      <td className="px-6 py-4">
                        <input type="text" value={a.name} onChange={(e) => handleUpdateAttend(a.id, 'name', e.target.value)} className="w-full bg-transparent outline-none font-medium p-1 focus:ring-1 focus:ring-indigo-100 rounded" />
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                        <span className="text-rose-600 font-bold">-¥</span>
                        <input type="number" value={a.unitAmount} onChange={(e) => handleUpdateAttend(a.id, 'unitAmount', Number(e.target.value))} className="w-16 text-right bg-transparent outline-none font-bold text-rose-600 p-1 focus:ring-1 focus:ring-rose-100 rounded" />
                        <span className="text-[10px] text-slate-400">/</span>
                        <input type="text" value={a.unitLabel} onChange={(e) => handleUpdateAttend(a.id, 'unitLabel', e.target.value)} className="w-8 text-xs bg-slate-50 rounded border border-slate-100 px-1" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setDeleteTarget({ id: a.id, type: 'attend', name: a.name })} className="text-slate-300 hover:text-rose-500 transition-colors">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 勤務実績評価マスタ */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 text-emerald-600">📈 勤務実績評価マスタ</h3>
              <button onClick={handleAddPerf} className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">+ 追加</button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500">
                  <tr>
                    <th className="px-6 py-4">項目名</th>
                    <th className="px-6 py-4 text-right">単価(加算)</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.performanceEvaluations.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/30">
                      <td className="px-6 py-4">
                        <input type="text" value={p.name} onChange={(e) => handleUpdatePerf(p.id, 'name', e.target.value)} className="w-full bg-transparent outline-none font-medium p-1 focus:ring-1 focus:ring-indigo-100 rounded" />
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                        <span className="text-emerald-600 font-bold">+¥</span>
                        <input type="number" value={p.unitAmount} onChange={(e) => handleUpdatePerf(p.id, 'unitAmount', Number(e.target.value))} className="w-16 text-right bg-transparent outline-none font-bold text-emerald-600 p-1 focus:ring-1 focus:ring-emerald-100 rounded" />
                        <span className="text-[10px] text-slate-400">/</span>
                        <input type="text" value={p.unitLabel} onChange={(e) => handleUpdatePerf(p.id, 'unitLabel', e.target.value)} className="w-8 text-xs bg-slate-50 rounded border border-slate-100 px-1" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setDeleteTarget({ id: p.id, type: 'perf', name: p.name })} className="text-slate-300 hover:text-rose-500 transition-colors">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
