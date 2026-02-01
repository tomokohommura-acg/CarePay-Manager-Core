import React, { useState, useMemo } from 'react';
import {
  Staff,
  Office,
  MasterData,
  BusinessType,
  HistoryEntry,
  EvaluationRecord,
  StaffUpdateData
} from '../types';
import { SalaryChart, FinalSalaryChart, SalaryBreakdownChart } from './SalaryChart';
import { EvaluationTable } from './EvaluationTable';
import { getEffectiveBaseSalary, sortHistoryByEffectiveMonth, formatMonth } from '../utils/salaryUtils';

interface StaffAnalyticsProps {
  staffList: Staff[];
  offices: Office[];
  masters: Record<BusinessType, MasterData>;
  history: HistoryEntry[];
}

export const StaffAnalytics: React.FC<StaffAnalyticsProps> = ({
  staffList,
  offices,
  masters,
  history
}) => {
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(offices[0]?.id || '');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // 選択中の事業所に所属する職員
  const officeStaff = useMemo(() => {
    return staffList.filter(s => s.officeId === selectedOfficeId);
  }, [staffList, selectedOfficeId]);

  // 選択中の職員
  const selectedStaff = useMemo(() => {
    return staffList.find(s => s.id === selectedStaffId);
  }, [staffList, selectedStaffId]);

  // 選択中の事業所
  const selectedOffice = useMemo(() => {
    return offices.find(o => o.id === selectedOfficeId);
  }, [offices, selectedOfficeId]);

  // マスタデータ
  const currentMaster = useMemo(() => {
    return selectedOffice ? masters[selectedOffice.type] : null;
  }, [selectedOffice, masters]);

  // 事業所変更時に職員選択をリセット
  const handleOfficeChange = (officeId: string) => {
    setSelectedOfficeId(officeId);
    setSelectedStaffId('');
  };

  // 職員の履歴データを抽出
  const staffHistoryData = useMemo(() => {
    if (!selectedStaff || !currentMaster) return [];

    const data: {
      periodName: string;
      periodId: string;
      baseSalary: number;
      qualAllowance: number;
      deduction: number;
      performance: number;
      finalSalary: number;
      inputs: StaffUpdateData | null;
    }[] = [];

    // 履歴から該当職員のデータを抽出（期間順）
    const relevantHistory = history
      .filter(h => h.officeId === selectedOfficeId)
      .sort((a, b) => {
        // 期間の評価開始日でソート
        return a.period.evaluationStart.localeCompare(b.period.evaluationStart);
      });

    for (const entry of relevantHistory) {
      const recordKey = `${entry.period.id}_${selectedStaffId}`;
      const record = entry.recordsSnapshot[recordKey] as EvaluationRecord | undefined;
      const input = entry.inputs[recordKey] as StaffUpdateData | undefined;

      if (!record) continue;

      // 資格手当を計算
      const applicableQuals = record.qualifications
        .map(qId => entry.masterSnapshot.qualifications.find(mq => mq.id === qId))
        .filter((q): q is any => !!q)
        .sort((a, b) => a.priority - b.priority);
      const qualAllowance = applicableQuals.length > 0 ? applicableQuals[0].allowance : 0;

      // 控除を計算
      let deduction = 0;
      if (input) {
        entry.masterSnapshot.attendanceConditions.forEach(cond => {
          deduction += (input.attendanceInputs[cond.id] || 0) * cond.unitAmount;
        });
      }

      // 業績を計算
      let performance = 0;
      if (input) {
        entry.masterSnapshot.performanceEvaluations.forEach(pe => {
          performance += (input.performanceInputs[pe.id] || 0) * pe.unitAmount;
        });
      }

      // 最終支給額
      const finalSalary = record.baseSalary + qualAllowance - deduction + performance;

      data.push({
        periodName: entry.period.name,
        periodId: entry.period.id,
        baseSalary: record.baseSalary,
        qualAllowance,
        deduction,
        performance,
        finalSalary,
        inputs: input || null
      });
    }

    return data;
  }, [selectedStaff, selectedOfficeId, history, currentMaster, selectedStaffId]);

  if (offices.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="text-4xl mb-4">📈</div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">事業所がありません</h3>
        <p className="text-slate-500">事業所を追加してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 職員選択 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">📈 職員分析</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              事業所
            </label>
            <select
              value={selectedOfficeId}
              onChange={(e) => handleOfficeChange(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {offices.map(office => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              職員
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={officeStaff.length === 0}
            >
              <option value="">-- 職員を選択 --</option>
              {officeStaff.map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                  {staff.resignedAt && ' (退職済み)'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 職員未選択時 */}
      {!selectedStaff && (
        <div className="bg-slate-50 rounded-2xl p-12 text-center border border-slate-200">
          <div className="text-4xl mb-4">👤</div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">職員を選択してください</h3>
          <p className="text-slate-500">職員を選択すると、給与と評価の推移が表示されます</p>
        </div>
      )}

      {/* 職員情報 */}
      {selectedStaff && (
        <>
          {/* 職員プロファイル */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-indigo-600">
                {selectedStaff.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-slate-800">{selectedStaff.name}</h4>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                  {selectedStaff.smarthrEmpCode && (
                    <span className="font-mono">社員番号: {selectedStaff.smarthrEmpCode}</span>
                  )}
                  {selectedStaff.enteredAt && (
                    <span>入社日: {selectedStaff.enteredAt}</span>
                  )}
                  {selectedStaff.resignedAt && (
                    <span className="text-rose-500">退職日: {selectedStaff.resignedAt}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">現在の基本給</span>
                <span className="text-2xl font-bold text-indigo-600">
                  ¥{selectedStaff.baseSalary.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* 基本給の推移 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <SalaryChart history={selectedStaff.baseSalaryHistory || []} />

            {/* 改定履歴タイムライン */}
            {selectedStaff.baseSalaryHistory && selectedStaff.baseSalaryHistory.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                  改定履歴
                </h5>
                <div className="space-y-2">
                  {sortHistoryByEffectiveMonth(selectedStaff.baseSalaryHistory).map((rev, idx, arr) => {
                    const prevAmount = idx > 0 ? arr[idx - 1].amount : null;
                    const diff = prevAmount ? rev.amount - prevAmount : null;
                    return (
                      <div key={rev.id} className="flex items-center gap-4 text-sm">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full" />
                        <span className="font-medium text-slate-600 w-24">
                          {formatMonth(rev.effectiveMonth)}
                        </span>
                        <span className="font-bold text-slate-800">
                          ¥{rev.amount.toLocaleString()}
                        </span>
                        {diff !== null && (
                          <span className={`text-xs font-bold ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            ({diff >= 0 ? '+' : ''}¥{diff.toLocaleString()})
                          </span>
                        )}
                        {rev.memo && (
                          <span className="text-xs text-slate-400">- {rev.memo}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 評価履歴がある場合 */}
          {staffHistoryData.length > 0 ? (
            <>
              {/* 最終支給額の推移 */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <FinalSalaryChart data={staffHistoryData} />
              </div>

              {/* 給与内訳の推移 */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <SalaryBreakdownChart data={staffHistoryData} />
              </div>

              {/* 評価項目の推移 */}
              {currentMaster && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <EvaluationTable
                    periodData={staffHistoryData.map(d => ({
                      periodName: d.periodName,
                      periodId: d.periodId,
                      inputs: d.inputs
                    }))}
                    master={currentMaster}
                  />
                </div>
              )}

              {/* サマリーテーブル */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h4 className="text-sm font-bold text-slate-600 mb-4 flex items-center gap-2">
                  📋 期間別サマリー
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">期間</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">基本給</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">資格手当</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-rose-500 uppercase tracking-widest">勤怠控除</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-emerald-500 uppercase tracking-widest">業績加算</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-indigo-600 uppercase tracking-widest">最終支給額</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffHistoryData.map(d => (
                        <tr key={d.periodId} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-700">{d.periodName}</td>
                          <td className="px-4 py-3 text-right text-slate-600">¥{d.baseSalary.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-slate-600">¥{d.qualAllowance.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-rose-600 font-bold">-¥{d.deduction.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-bold">+¥{d.performance.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-indigo-600 font-bold">¥{d.finalSalary.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-200">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">評価履歴がありません</h3>
              <p className="text-slate-500">
                「評価データ入力」画面で評価を保存すると、ここに履歴が表示されます
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
