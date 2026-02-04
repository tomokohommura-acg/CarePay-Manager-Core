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
import { SalaryChart, FinalSalaryChart, SalaryBreakdownChart, ViewMode, ViewModeSwitch } from './SalaryChart';
import { Line, Bar } from 'react-chartjs-2';
import { EvaluationTable } from './EvaluationTable';
import { getEffectiveBaseSalary, sortHistoryByEffectiveMonth, formatMonth } from '../utils/salaryUtils';

interface StaffAnalyticsProps {
  staffList: Staff[];
  offices: Office[];
  masters: Record<BusinessType, MasterData>;
  history: HistoryEntry[];
  selectedOfficeId: string;
  isAllOfficesMode?: boolean;
}

type StaffFilter = 'active' | 'resigned' | 'all';

export const StaffAnalytics: React.FC<StaffAnalyticsProps> = ({
  staffList,
  offices,
  masters,
  history,
  selectedOfficeId,
  isAllOfficesMode = false
}) => {
  const [staffFilter, setStaffFilter] = useState<StaffFilter>('active');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 各グラフの表示モード
  const [baseSalaryViewMode, setBaseSalaryViewMode] = useState<ViewMode>('line');
  const [finalSalaryViewMode, setFinalSalaryViewMode] = useState<ViewMode>('line');
  const [breakdownViewMode, setBreakdownViewMode] = useState<ViewMode>('bar');
  const [evaluationViewMode, setEvaluationViewMode] = useState<ViewMode>('table');
  const [summaryViewMode, setSummaryViewMode] = useState<ViewMode>('table');

  // 選択中の事業所の職員リスト（全事業所モードの場合は全職員）
  const officeStaffList = useMemo(() => {
    if (isAllOfficesMode) {
      return staffList;
    }
    return staffList.filter(s => s.officeId === selectedOfficeId);
  }, [staffList, selectedOfficeId, isAllOfficesMode]);

  // フィルタ適用後の職員リスト
  const filteredStaffList = useMemo(() => {
    let list = [...officeStaffList];

    // 在籍状況でフィルタ
    if (staffFilter === 'active') {
      list = list.filter(s => !s.resignedAt);
    } else if (staffFilter === 'resigned') {
      list = list.filter(s => !!s.resignedAt);
    }

    // 検索クエリでフィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.smarthrEmpCode?.toLowerCase().includes(query)
      );
    }

    // 名前順でソート
    return list.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }, [officeStaffList, staffFilter, searchQuery]);

  // 選択中の職員
  const selectedStaff = useMemo(() => {
    return staffList.find(s => s.id === selectedStaffId);
  }, [staffList, selectedStaffId]);

  // 選択中の職員の事業所
  const selectedStaffOffice = useMemo(() => {
    return selectedStaff ? offices.find(o => o.id === selectedStaff.officeId) : null;
  }, [selectedStaff, offices]);

  // マスタデータ
  const currentMaster = useMemo(() => {
    return selectedStaffOffice ? masters[selectedStaffOffice.type] : null;
  }, [selectedStaffOffice, masters]);

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
      .filter(h => h.officeId === selectedStaff.officeId)
      .sort((a, b) => {
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
  }, [selectedStaff, history, currentMaster, selectedStaffId]);

  // 事業所名を取得
  const getOfficeName = (officeId: string) => {
    return offices.find(o => o.id === officeId)?.name || '不明';
  };

  // 選択中の事業所
  const selectedOffice = useMemo(() => {
    return offices.find(o => o.id === selectedOfficeId);
  }, [offices, selectedOfficeId]);

  // カウント（選択中の事業所内）
  const activeCount = officeStaffList.filter(s => !s.resignedAt).length;
  const resignedCount = officeStaffList.filter(s => !!s.resignedAt).length;

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
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">📈 職員分析</h3>
          {isAllOfficesMode && (
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
              全事業所表示中
            </span>
          )}
        </div>

        {/* フィルタタブ */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => { setStaffFilter('active'); setSelectedStaffId(''); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              staffFilter === 'active'
                ? 'bg-[#3dcc65] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            在籍中 ({activeCount})
          </button>
          <button
            onClick={() => { setStaffFilter('resigned'); setSelectedStaffId(''); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              staffFilter === 'resigned'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            退職済み ({resignedCount})
          </button>
          <button
            onClick={() => { setStaffFilter('all'); setSelectedStaffId(''); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              staffFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全リスト ({officeStaffList.length})
          </button>
        </div>

        {/* 検索 */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            検索
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="名前または社員番号で検索..."
            className="w-full md:w-64 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 職員一覧 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h4 className="text-sm font-bold text-slate-700">
            職員一覧 ({filteredStaffList.length}名)
          </h4>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {filteredStaffList.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              該当する職員がいません
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">社員番号</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">氏名</th>
                  {isAllOfficesMode && (
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">事業所</th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">基本給</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">状態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaffList.map(staff => (
                  <tr
                    key={staff.id}
                    onClick={() => setSelectedStaffId(staff.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedStaffId === staff.id
                        ? 'bg-indigo-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {staff.smarthrEmpCode || '-'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {staff.name}
                    </td>
                    {isAllOfficesMode && (
                      <td className="px-4 py-3 text-slate-600 text-sm">
                        {getOfficeName(staff.officeId)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-slate-700">
                      ¥{staff.baseSalary.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {staff.resignedAt ? (
                        <span className="px-2 py-1 bg-rose-100 text-rose-600 rounded-full text-xs font-medium">
                          退職済み
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-full text-xs font-medium">
                          在籍中
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 職員詳細 */}
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
                  <span>事業所: {getOfficeName(selectedStaff.officeId)}</span>
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
            <SalaryChart
              history={selectedStaff.baseSalaryHistory || []}
              viewMode={baseSalaryViewMode}
              onViewModeChange={setBaseSalaryViewMode}
            />

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
                <FinalSalaryChart
                  data={staffHistoryData}
                  viewMode={finalSalaryViewMode}
                  onViewModeChange={setFinalSalaryViewMode}
                />
              </div>

              {/* 給与内訳の推移 */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <SalaryBreakdownChart
                  data={staffHistoryData}
                  viewMode={breakdownViewMode}
                  onViewModeChange={setBreakdownViewMode}
                />
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
                    viewMode={evaluationViewMode}
                    onViewModeChange={setEvaluationViewMode}
                  />
                </div>
              )}

              {/* サマリーテーブル */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                    📋 期間別サマリー
                  </h4>
                  <ViewModeSwitch mode={summaryViewMode} onChange={setSummaryViewMode} />
                </div>
                {summaryViewMode === 'table' ? (
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
                ) : (
                  <div style={{ height: '300px' }}>
                    {summaryViewMode === 'line' ? (
                      <Line
                        data={{
                          labels: staffHistoryData.map(d => d.periodName),
                          datasets: [
                            {
                              label: '基本給',
                              data: staffHistoryData.map(d => d.baseSalary),
                              borderColor: 'rgb(99, 102, 241)',
                              backgroundColor: 'rgba(99, 102, 241, 0.1)',
                              borderWidth: 3,
                              pointRadius: 5,
                              tension: 0.3
                            },
                            {
                              label: '資格手当',
                              data: staffHistoryData.map(d => d.qualAllowance),
                              borderColor: 'rgb(139, 92, 246)',
                              backgroundColor: 'rgba(139, 92, 246, 0.1)',
                              borderWidth: 3,
                              pointRadius: 5,
                              tension: 0.3
                            },
                            {
                              label: '勤怠控除',
                              data: staffHistoryData.map(d => -d.deduction),
                              borderColor: 'rgb(244, 63, 94)',
                              backgroundColor: 'rgba(244, 63, 94, 0.1)',
                              borderWidth: 3,
                              pointRadius: 5,
                              tension: 0.3
                            },
                            {
                              label: '業績加算',
                              data: staffHistoryData.map(d => d.performance),
                              borderColor: 'rgb(34, 197, 94)',
                              backgroundColor: 'rgba(34, 197, 94, 0.1)',
                              borderWidth: 3,
                              pointRadius: 5,
                              tension: 0.3
                            },
                            {
                              label: '最終支給額',
                              data: staffHistoryData.map(d => d.finalSalary),
                              borderColor: 'rgb(59, 130, 246)',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              borderWidth: 3,
                              pointRadius: 5,
                              tension: 0.3
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: { usePointStyle: true, pointStyle: 'circle', padding: 15, font: { size: 10 } }
                            },
                            tooltip: {
                              backgroundColor: 'rgba(15, 23, 42, 0.9)',
                              callbacks: {
                                label: (context: any) => `${context.dataset.label}: ¥${Math.abs(context.raw).toLocaleString()}`
                              }
                            }
                          },
                          scales: {
                            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                            y: { grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { font: { size: 11 }, callback: (value: any) => `¥${(value / 10000).toFixed(0)}万` } }
                          }
                        }}
                      />
                    ) : (
                      <Bar
                        data={{
                          labels: staffHistoryData.map(d => d.periodName),
                          datasets: [
                            {
                              label: '基本給',
                              data: staffHistoryData.map(d => d.baseSalary),
                              backgroundColor: 'rgba(99, 102, 241, 0.8)',
                              borderRadius: 4
                            },
                            {
                              label: '資格手当',
                              data: staffHistoryData.map(d => d.qualAllowance),
                              backgroundColor: 'rgba(139, 92, 246, 0.8)',
                              borderRadius: 4
                            },
                            {
                              label: '勤怠控除',
                              data: staffHistoryData.map(d => -d.deduction),
                              backgroundColor: 'rgba(244, 63, 94, 0.8)',
                              borderRadius: 4
                            },
                            {
                              label: '業績加算',
                              data: staffHistoryData.map(d => d.performance),
                              backgroundColor: 'rgba(34, 197, 94, 0.8)',
                              borderRadius: 4
                            },
                            {
                              label: '最終支給額',
                              data: staffHistoryData.map(d => d.finalSalary),
                              backgroundColor: 'rgba(59, 130, 246, 0.8)',
                              borderRadius: 4
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: { usePointStyle: true, pointStyle: 'circle', padding: 15, font: { size: 10 } }
                            },
                            tooltip: {
                              backgroundColor: 'rgba(15, 23, 42, 0.9)',
                              callbacks: {
                                label: (context: any) => `${context.dataset.label}: ¥${Math.abs(context.raw).toLocaleString()}`
                              }
                            }
                          },
                          scales: {
                            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                            y: { grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { font: { size: 11 }, callback: (value: any) => `¥${(value / 10000).toFixed(0)}万` } }
                          }
                        }}
                      />
                    )}
                  </div>
                )}
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

      {/* 職員未選択時 */}
      {!selectedStaff && filteredStaffList.length > 0 && (
        <div className="bg-slate-50 rounded-2xl p-12 text-center border border-slate-200">
          <div className="text-4xl mb-4">👆</div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">職員を選択してください</h3>
          <p className="text-slate-500">上の一覧から職員をクリックすると、詳細が表示されます</p>
        </div>
      )}
    </div>
  );
};
