import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { MasterData, StaffUpdateData } from '../types';
import { ViewMode, ViewModeSwitch } from './SalaryChart';

// Chart.js登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface EvaluationTableProps {
  periodData: {
    periodName: string;
    periodId: string;
    inputs: StaffUpdateData | null;
  }[];
  master: MasterData;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export const EvaluationTable: React.FC<EvaluationTableProps> = ({
  periodData,
  master,
  viewMode = 'table',
  onViewModeChange
}) => {
  if (periodData.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl p-8 text-center">
        <p className="text-slate-500">評価データがありません</p>
      </div>
    );
  }

  // 各期間のデータを整理
  const rows: { label: string; type: 'attendance' | 'performance'; id: string; values: number[] }[] = [];

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

  const attendanceRows = rows.filter(r => r.type === 'attendance');
  const performanceRows = rows.filter(r => r.type === 'performance');

  // グラフ用の色
  const attendanceColors = [
    'rgba(244, 63, 94, 0.8)',
    'rgba(251, 146, 60, 0.8)',
    'rgba(234, 179, 8, 0.8)',
    'rgba(236, 72, 153, 0.8)'
  ];
  const performanceColors = [
    'rgba(34, 197, 94, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(20, 184, 166, 0.8)'
  ];

  const chartData = {
    labels: periodData.map(pd => pd.periodName),
    datasets: [
      ...attendanceRows.map((row, idx) => ({
        label: row.label,
        data: row.values,
        backgroundColor: attendanceColors[idx % attendanceColors.length],
        borderColor: attendanceColors[idx % attendanceColors.length].replace('0.8', '1'),
        borderWidth: viewMode === 'line' ? 3 : 0,
        borderRadius: 4,
        pointBackgroundColor: attendanceColors[idx % attendanceColors.length].replace('0.8', '1'),
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: viewMode === 'line' ? 5 : 0,
        tension: 0.3
      })),
      ...performanceRows.map((row, idx) => ({
        label: row.label,
        data: row.values,
        backgroundColor: performanceColors[idx % performanceColors.length],
        borderColor: performanceColors[idx % performanceColors.length].replace('0.8', '1'),
        borderWidth: viewMode === 'line' ? 3 : 0,
        borderRadius: 4,
        pointBackgroundColor: performanceColors[idx % performanceColors.length].replace('0.8', '1'),
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: viewMode === 'line' ? 5 : 0,
        tension: 0.3
      }))
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: { size: 10 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 12 },
        bodyFont: { size: 13 },
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: { size: 10 }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: { size: 11 }
        }
      }
    }
  };

  const renderTable = () => (
    <>
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
            {rows.map((row) => (
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
    </>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2">
          📋 評価項目の推移
        </h4>
        {onViewModeChange && (
          <ViewModeSwitch mode={viewMode} onChange={onViewModeChange} />
        )}
      </div>
      {viewMode === 'table' ? (
        renderTable()
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-4" style={{ height: '350px' }}>
          {viewMode === 'line' ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      )}
    </div>
  );
};
