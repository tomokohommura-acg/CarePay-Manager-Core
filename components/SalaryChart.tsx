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
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { BaseSalaryRevision } from '../types';
import { sortHistoryByEffectiveMonth, formatMonth } from '../utils/salaryUtils';

// Chart.js登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// 表示モードの型
export type ViewMode = 'table' | 'bar' | 'line';

// 表示切り替えボタンコンポーネント
interface ViewModeSwitchProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewModeSwitch: React.FC<ViewModeSwitchProps> = ({ mode, onChange }) => {
  const buttons: { value: ViewMode; label: string; icon: string }[] = [
    { value: 'table', label: '表', icon: '📋' },
    { value: 'bar', label: '棒', icon: '📊' },
    { value: 'line', label: '線', icon: '📈' }
  ];

  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      {buttons.map(btn => (
        <button
          key={btn.value}
          onClick={() => onChange(btn.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
            mode === btn.value
              ? 'bg-[#26519f] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span>{btn.icon}</span>
          <span>{btn.label}</span>
        </button>
      ))}
    </div>
  );
};

interface SalaryChartProps {
  history: BaseSalaryRevision[];
  title?: string;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export const SalaryChart: React.FC<SalaryChartProps> = ({
  history,
  title = '基本給の推移',
  viewMode = 'line',
  onViewModeChange
}) => {
  const sortedHistory = sortHistoryByEffectiveMonth(history);

  if (sortedHistory.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl p-8 text-center">
        <p className="text-slate-500">基本給の改定履歴がありません</p>
      </div>
    );
  }

  const chartData = {
    labels: sortedHistory.map(rev => formatMonth(rev.effectiveMonth)),
    datasets: [
      {
        label: '基本給',
        data: sortedHistory.map(rev => rev.amount),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: viewMode === 'bar' ? 'rgba(99, 102, 241, 0.8)' : 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.3,
        fill: true,
        borderRadius: 4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 12 },
        bodyFont: { size: 14, weight: 'bold' as const },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `¥${context.raw.toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: { size: 11 }
        }
      },
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: { size: 11 },
          callback: (value: any) => `¥${(value / 10000).toFixed(0)}万`
        }
      }
    }
  };

  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">適用月</th>
            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">基本給</th>
            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">増減</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedHistory.map((rev, idx) => {
            const prevAmount = idx > 0 ? sortedHistory[idx - 1].amount : null;
            const diff = prevAmount ? rev.amount - prevAmount : null;
            return (
              <tr key={rev.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-700">{formatMonth(rev.effectiveMonth)}</td>
                <td className="px-4 py-3 text-right text-slate-800 font-bold">¥{rev.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {diff !== null ? (
                    <span className={`font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {diff >= 0 ? '+' : ''}¥{diff.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2">
          📈 {title}
        </h4>
        {onViewModeChange && (
          <ViewModeSwitch mode={viewMode} onChange={onViewModeChange} />
        )}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4" style={{ minHeight: '250px' }}>
        {viewMode === 'table' ? (
          renderTable()
        ) : viewMode === 'bar' ? (
          <div style={{ height: '250px' }}>
            <Bar data={chartData} options={options} />
          </div>
        ) : (
          <div style={{ height: '250px' }}>
            <Line data={chartData} options={options} />
          </div>
        )}
      </div>
    </div>
  );
};

interface FinalSalaryChartProps {
  data: {
    periodName: string;
    baseSalary: number;
    qualAllowance: number;
    deduction: number;
    performance: number;
    finalSalary: number;
  }[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export const FinalSalaryChart: React.FC<FinalSalaryChartProps> = ({
  data,
  viewMode = 'line',
  onViewModeChange
}) => {
  if (data.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl p-8 text-center">
        <p className="text-slate-500">評価履歴がありません</p>
      </div>
    );
  }

  const chartData = {
    labels: data.map(d => d.periodName),
    datasets: [
      {
        label: '最終支給額',
        data: data.map(d => d.finalSalary),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: viewMode === 'bar' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(34, 197, 94, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.3,
        fill: true,
        borderRadius: 4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 12 },
        bodyFont: { size: 14, weight: 'bold' as const },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `¥${context.raw.toLocaleString()}`
        }
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
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: { size: 11 },
          callback: (value: any) => `¥${(value / 10000).toFixed(0)}万`
        }
      }
    }
  };

  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">期間</th>
            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">最終支給額</th>
            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">増減</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((d, idx) => {
            const prevAmount = idx > 0 ? data[idx - 1].finalSalary : null;
            const diff = prevAmount ? d.finalSalary - prevAmount : null;
            return (
              <tr key={d.periodName} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-700">{d.periodName}</td>
                <td className="px-4 py-3 text-right text-emerald-600 font-bold">¥{d.finalSalary.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {diff !== null ? (
                    <span className={`font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {diff >= 0 ? '+' : ''}¥{diff.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2">
          💰 最終支給額の推移
        </h4>
        {onViewModeChange && (
          <ViewModeSwitch mode={viewMode} onChange={onViewModeChange} />
        )}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4" style={{ minHeight: '250px' }}>
        {viewMode === 'table' ? (
          renderTable()
        ) : viewMode === 'bar' ? (
          <div style={{ height: '250px' }}>
            <Bar data={chartData} options={options} />
          </div>
        ) : (
          <div style={{ height: '250px' }}>
            <Line data={chartData} options={options} />
          </div>
        )}
      </div>
    </div>
  );
};

interface SalaryBreakdownChartProps {
  data: {
    periodName: string;
    baseSalary: number;
    qualAllowance: number;
    deduction: number;
    performance: number;
  }[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export const SalaryBreakdownChart: React.FC<SalaryBreakdownChartProps> = ({
  data,
  viewMode = 'bar',
  onViewModeChange
}) => {
  if (data.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl p-8 text-center">
        <p className="text-slate-500">評価履歴がありません</p>
      </div>
    );
  }

  const chartData = {
    labels: data.map(d => d.periodName),
    datasets: [
      {
        label: '基本給',
        data: data.map(d => d.baseSalary),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: viewMode === 'line' ? 3 : 0,
        borderRadius: 4,
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: viewMode === 'line' ? 5 : 0,
        tension: 0.3,
        fill: false
      },
      {
        label: '資格手当',
        data: data.map(d => d.qualAllowance),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: viewMode === 'line' ? 3 : 0,
        borderRadius: 4,
        pointBackgroundColor: 'rgb(139, 92, 246)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: viewMode === 'line' ? 5 : 0,
        tension: 0.3,
        fill: false
      },
      {
        label: '業績加算',
        data: data.map(d => d.performance),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: viewMode === 'line' ? 3 : 0,
        borderRadius: 4,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: viewMode === 'line' ? 5 : 0,
        tension: 0.3,
        fill: false
      },
      {
        label: '勤怠控除',
        data: data.map(d => -d.deduction),
        backgroundColor: 'rgba(244, 63, 94, 0.8)',
        borderColor: 'rgb(244, 63, 94)',
        borderWidth: viewMode === 'line' ? 3 : 0,
        borderRadius: 4,
        pointBackgroundColor: 'rgb(244, 63, 94)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: viewMode === 'line' ? 5 : 0,
        tension: 0.3,
        fill: false
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { size: 11 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 12 },
        bodyFont: { size: 13 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const prefix = value >= 0 ? '+' : '';
            return `${context.dataset.label}: ${prefix}¥${Math.abs(value).toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false
        },
        ticks: {
          font: { size: 10 }
        }
      },
      y: {
        stacked: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: { size: 11 },
          callback: (value: any) => `¥${(value / 10000).toFixed(0)}万`
        }
      }
    }
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { size: 11 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 12 },
        bodyFont: { size: 13 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const prefix = value >= 0 ? '+' : '';
            return `${context.dataset.label}: ${prefix}¥${Math.abs(value).toLocaleString()}`;
          }
        }
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
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: { size: 11 },
          callback: (value: any) => `¥${(value / 10000).toFixed(0)}万`
        }
      }
    }
  };

  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">期間</th>
            <th className="px-4 py-3 text-right text-xs font-bold text-indigo-500 uppercase tracking-widest">基本給</th>
            <th className="px-4 py-3 text-right text-xs font-bold text-violet-500 uppercase tracking-widest">資格手当</th>
            <th className="px-4 py-3 text-right text-xs font-bold text-emerald-500 uppercase tracking-widest">業績加算</th>
            <th className="px-4 py-3 text-right text-xs font-bold text-rose-500 uppercase tracking-widest">勤怠控除</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map(d => (
            <tr key={d.periodName} className="hover:bg-slate-50/50">
              <td className="px-4 py-3 font-medium text-slate-700">{d.periodName}</td>
              <td className="px-4 py-3 text-right text-indigo-600 font-bold">¥{d.baseSalary.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-violet-600 font-bold">¥{d.qualAllowance.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-emerald-600 font-bold">+¥{d.performance.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-rose-600 font-bold">-¥{d.deduction.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2">
          📊 給与内訳の推移
        </h4>
        {onViewModeChange && (
          <ViewModeSwitch mode={viewMode} onChange={onViewModeChange} />
        )}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4" style={{ minHeight: '300px' }}>
        {viewMode === 'table' ? (
          renderTable()
        ) : viewMode === 'line' ? (
          <div style={{ height: '300px' }}>
            <Line data={chartData} options={lineOptions} />
          </div>
        ) : (
          <div style={{ height: '300px' }}>
            <Bar data={chartData} options={barOptions} />
          </div>
        )}
      </div>
    </div>
  );
};
