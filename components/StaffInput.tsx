
import React from 'react';
import { EvaluationRecord, MasterData, StaffUpdateData } from '../types';

interface StaffInputProps {
  records: EvaluationRecord[];
  master: MasterData;
  inputs: Record<string, StaffUpdateData>;
  selectedPeriodId: string;
  onPeriodChange: (id: string) => void;
  onInputChange: (data: StaffUpdateData) => void;
  onSaveHistory: () => void;
  onOpenDashboard: (staffId: string) => void;
  canEdit?: boolean;
}

export const StaffInput: React.FC<StaffInputProps> = ({
  records,
  master,
  inputs,
  selectedPeriodId,
  onPeriodChange,
  onInputChange,
  onSaveHistory,
  onOpenDashboard,
  canEdit = true
}) => {
  const activePeriod = master.periods.find(p => p.id === selectedPeriodId) || master.periods[0];
  const isPeriodLocked = activePeriod?.status === 'locked' || !canEdit;

  const calculateResult = (record: EvaluationRecord) => {
    const key = `${selectedPeriodId}_${record.staffId}`;
    const input = inputs[key] || { attendanceInputs: {}, performanceInputs: {}, staffId: record.staffId, periodId: selectedPeriodId, isLocked: false };
    
    const applicableQuals = record.qualifications
      .map(qId => master.qualifications.find(mq => mq.id === qId))
      .filter((q): q is any => !!q)
      .sort((a, b) => a.priority - b.priority);

    const qualAllowances = applicableQuals.length > 0 ? applicableQuals[0].allowance : 0;
    const regularSalary = record.baseSalary + qualAllowances;

    let totalDeduction = 0;
    master.attendanceConditions.forEach(cond => {
      totalDeduction += (input.attendanceInputs[cond.id] || 0) * cond.unitAmount;
    });

    let totalPerformance = 0;
    master.performanceEvaluations.forEach(pe => {
      totalPerformance += (input.performanceInputs[pe.id] || 0) * pe.unitAmount;
    });

    const netAdjustment = totalPerformance - totalDeduction;
    const updatedSalary = regularSalary + netAdjustment;
    
    // 前回の最終支給額（名簿に保存されている previousSalary）を「旧給与」として扱う
    const previousSalary = record.previousSalary || 0;
    
    // 差分の計算: 旧給与 - 最終支給額（新給与）
    // ユーザーの要望「旧給与 - 最終支給額（新給与）」に基づき修正
    const diff = previousSalary > 0 ? previousSalary - updatedSalary : null;

    return {
      qualAllowances,
      regularSalary,
      totalDeduction,
      totalPerformance,
      netAdjustment,
      updatedSalary,
      previousSalary,
      diff,
      isLocked: isPeriodLocked || !!input.isLocked
    };
  };

  const handleValueChange = (staffId: string, type: 'attendance' | 'performance', itemId: string, value: number) => {
    if (isPeriodLocked) return;
    const key = `${selectedPeriodId}_${staffId}`;
    const currentInput = inputs[key] || { staffId, periodId: selectedPeriodId, attendanceInputs: {}, performanceInputs: {}, isLocked: false };
    if (currentInput.isLocked) return;

    const newInputs = { ...currentInput };
    if (type === 'attendance') {
      newInputs.attendanceInputs = { ...newInputs.attendanceInputs, [itemId]: value };
    } else {
      newInputs.performanceInputs = { ...newInputs.performanceInputs, [itemId]: value };
    }
    onInputChange(newInputs);
  };

  const toggleLock = (staffId: string) => {
    if (isPeriodLocked) return;
    const key = `${selectedPeriodId}_${staffId}`;
    const currentInput = inputs[key] || { staffId, periodId: selectedPeriodId, attendanceInputs: {}, performanceInputs: {}, isLocked: false };
    onInputChange({ ...currentInput, isLocked: !currentInput.isLocked });
  };

  return (
    <div className="space-y-8">
      {/* 閲覧専用モード警告 */}
      {isPeriodLocked && (
        <div className="bg-rose-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-rose-200 animate-in slide-in-from-top duration-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="font-bold text-sm">閲覧専用モード</p>
              <p className="text-[10px] opacity-80">この評価期間は確定済みのため、データの編集はできません。マスタ設定からステータスを変更できます。</p>
            </div>
          </div>
          <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-full uppercase tracking-widest">Locked</span>
        </div>
      )}

      <div className={`bg-white rounded-2xl p-6 shadow-sm border ${isPeriodLocked ? 'border-rose-200' : 'border-slate-200'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">評価期間の選択</label>
            <div className="flex items-center gap-4">
              <select 
                value={selectedPeriodId} 
                onChange={(e) => onPeriodChange(e.target.value)}
                className={`bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 text-sm font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 min-w-[240px] ${isPeriodLocked ? 'ring-2 ring-rose-100 border-rose-200' : ''}`}
              >
                {master.periods.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.status === 'locked' ? '🔒 ' : ''}{p.name}
                  </option>
                ))}
              </select>
              {activePeriod && (
                <div className="flex gap-4 text-[10px] text-slate-400 font-medium">
                  <div>対象: {activePeriod.evaluationStart} ~ {activePeriod.evaluationEnd}</div>
                  <div className="text-indigo-600">反映: {activePeriod.paymentStart} ~ {activePeriod.paymentEnd}</div>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onSaveHistory}
            disabled={isPeriodLocked}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg ${
              isPeriodLocked
              ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
            }`}
          >
            💾 評価を履歴保存
          </button>
        </div>
      </div>

      <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ${isPeriodLocked ? 'grayscale-[0.2]' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 z-20 bg-slate-50 px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left min-w-[200px] border-r border-slate-200">
                  氏名 / 状態
                </th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 text-right">基本給</th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 text-right">資格手当</th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-600 bg-slate-100/50 text-right">正規給与</th>
                {master.attendanceConditions.map(cond => (
                  <th key={cond.id} className="px-4 py-4 text-[10px] font-bold text-rose-500 border-r border-slate-200 bg-rose-50/30 text-center">
                    {cond.name}<br/><span className="text-[8px] font-normal">(-¥{cond.unitAmount.toLocaleString()})</span>
                  </th>
                ))}
                <th className="px-4 py-4 text-[10px] font-black text-rose-700 bg-rose-100/50 text-right">減額合計</th>
                {master.performanceEvaluations.map(pe => (
                  <th key={pe.id} className="px-4 py-4 text-[10px] font-bold text-emerald-600 border-r border-slate-200 bg-emerald-50/30 text-center">
                    {pe.name}<br/><span className="text-[8px] font-normal">(¥{pe.unitAmount.toLocaleString()})</span>
                  </th>
                ))}
                <th className="px-4 py-4 text-[10px] font-black text-emerald-800 bg-emerald-100 text-right">評価合計</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-700 bg-slate-100 text-right">特別加減算</th>
                <th className="px-6 py-4 text-[10px] font-black text-indigo-800 bg-indigo-100 text-right whitespace-nowrap">最終支給額（新給与）</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-500 bg-slate-50 text-right whitespace-nowrap">旧給与</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-600 text-right">差分</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map(record => {
                const results = calculateResult(record);
                const key = `${selectedPeriodId}_${record.staffId}`;
                const input = inputs[key] || { attendanceInputs: {}, performanceInputs: {}, staffId: record.staffId, isLocked: false };
                
                return (
                  <tr key={record.staffId} className={`transition-colors text-right ${results.isLocked ? 'bg-slate-100/50' : 'hover:bg-slate-50/50'}`}>
                    <td className={`sticky left-0 z-10 px-6 py-4 border-r border-slate-200 text-left ${results.isLocked ? 'bg-slate-100' : 'bg-white'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onOpenDashboard(record.staffId)}>
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${results.isLocked ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                            {isPeriodLocked ? '🔒' : record.name.charAt(0)}
                          </div>
                          <div className="font-bold text-sm text-slate-800 group-hover:text-indigo-600 border-b border-transparent group-hover:border-indigo-300">{record.name}</div>
                        </div>
                        <button 
                          onClick={() => toggleLock(record.staffId)} 
                          disabled={isPeriodLocked}
                          className={`text-[9px] px-2 py-1 rounded-md font-bold border transition-all ${
                            isPeriodLocked 
                            ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                            : (results.isLocked ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-indigo-50 border-indigo-200 text-indigo-600')
                          }`}
                        >
                          {isPeriodLocked ? '確定済' : (results.isLocked ? '解除' : '確定')}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">¥{record.baseSalary.toLocaleString()}</td>
                    <td className="px-4 py-4 text-xs text-slate-500">¥{results.qualAllowances.toLocaleString()}</td>
                    <td className="px-4 py-4 bg-slate-50/30 font-bold text-sm text-slate-700">¥{results.regularSalary.toLocaleString()}</td>
                    {master.attendanceConditions.map(cond => (
                      <td key={cond.id} className="px-3 py-4 border-r border-slate-100">
                        <input 
                          type="number" 
                          min="0" 
                          disabled={results.isLocked} 
                          value={input.attendanceInputs[cond.id] || 0} 
                          onChange={(e) => handleValueChange(record.staffId, 'attendance', cond.id, Number(e.target.value))} 
                          className={`w-12 border rounded px-1 py-1 text-center text-xs font-bold ${results.isLocked ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-white'}`} 
                        />
                      </td>
                    ))}
                    <td className="px-4 py-4 bg-rose-100/40 text-rose-700 font-black text-xs">-¥{results.totalDeduction.toLocaleString()}</td>
                    {master.performanceEvaluations.map(pe => (
                      <td key={pe.id} className="px-3 py-4 border-r border-slate-100">
                        <input 
                          type="number" 
                          disabled={results.isLocked} 
                          value={input.performanceInputs[pe.id] || 0} 
                          onChange={(e) => handleValueChange(record.staffId, 'performance', pe.id, Number(e.target.value))} 
                          className={`w-12 border rounded px-1 py-1 text-center text-xs font-bold ${results.isLocked ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-white'}`} 
                        />
                      </td>
                    ))}
                    <td className="px-4 py-4 bg-emerald-100 font-black text-emerald-800 text-xs">+¥{results.totalPerformance.toLocaleString()}</td>
                    <td className={`px-4 py-4 bg-slate-100 font-black text-xs ${results.netAdjustment >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {results.netAdjustment >= 0 ? '+' : ''}¥{results.netAdjustment.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 bg-indigo-100 font-black text-indigo-800 text-sm">¥{results.updatedSalary.toLocaleString()}</td>
                    <td className="px-4 py-4 bg-slate-50 font-bold text-xs text-slate-500 whitespace-nowrap">
                      {results.previousSalary > 0 ? `¥${results.previousSalary.toLocaleString()}` : '---'}
                    </td>
                    <td className={`px-4 py-4 bg-slate-100/30 font-bold text-xs ${results.diff !== null ? (results.diff >= 0 ? 'text-blue-600' : 'text-rose-600') : 'text-slate-300'}`}>
                      {results.diff !== null ? `${results.diff >= 0 ? '+' : ''}¥${results.diff.toLocaleString()}` : '---'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
