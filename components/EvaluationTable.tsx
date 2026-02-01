import React from 'react';
import { MasterData, StaffUpdateData } from '../types';

interface EvaluationTableProps {
  periodData: {
    periodName: string;
    periodId: string;
    inputs: StaffUpdateData | null;
  }[];
  master: MasterData;
}

export const EvaluationTable: React.FC<EvaluationTableProps> = ({ periodData, master }) => {
  if (periodData.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl p-8 text-center">
        <p className="text-slate-500">評価データがありません</p>
      </div>
    );
  }

  // 各期間のデータを整理
  const rows: { label: string; type: 'attendance' | 'performance'; id: string; values: (number | string)[] }[] = [];

  // 勤怠条件
  master.attendanceConditions.forEach(cond => {
    rows.push({
      label: cond.name,
      type: 'attendance',
      id: cond.id,
      values: periodData.map(pd => pd.inputs?.attendanceInputs[cond.id] || 0)
    });
  });

  // 業績評価
  master.performanceEvaluations.forEach(perf => {
    rows.push({
      label: perf.name,
      type: 'performance',
      id: perf.id,
      values: periodData.map(pd => pd.inputs?.performanceInputs[perf.id] || 0)
    });
  });

  return (
    <div>
      <h4 className="text-sm font-bold text-slate-600 mb-4 flex items-center gap-2">
        📋 評価項目の推移
      </h4>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                項目
              </th>
              {periodData.map(pd => (
                <th
                  key={pd.periodId}
                  className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest"
                >
                  {pd.periodName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={`${row.type}_${row.id}`} className="hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        row.type === 'attendance' ? 'bg-rose-400' : 'bg-emerald-400'
                      }`}
                    />
                    <span className="font-medium text-slate-700">{row.label}</span>
                  </div>
                </td>
                {row.values.map((value, vIdx) => (
                  <td
                    key={vIdx}
                    className={`px-4 py-3 text-center font-bold ${
                      value === 0
                        ? 'text-slate-300'
                        : row.type === 'attendance'
                        ? 'text-rose-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-400" />
          <span>勤怠控除項目</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>業績評価項目</span>
        </div>
      </div>
    </div>
  );
};
