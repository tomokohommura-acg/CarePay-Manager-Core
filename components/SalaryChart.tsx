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

interface SalaryChartProps {
  history: BaseSalaryRevision[];
  title?: string;
}

export const SalaryChart: React.FC<SalaryChartProps> = ({ history, title = '基本給の推移' }) => {
  const sortedHistory = sortHistoryByEffectiveMonth(history);

  if (sortedHistory.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl p-8 text-center">
        <p className="text-slate-500">基本給の改定履歴がありません</p>
      </div>
    );
  }

  const data = {
    labels: sortedHistory.map(rev => formatMonth(rev.effectiveMonth)),
    datasets: [
      {
        label: '基本給',
        data: sortedHistory.map(rev => rev.amount),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.3,
        fill: true
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

  return (
    <div>
      <h4 className="text-sm font-bold text-slate-600 mb-4 flex items-center gap-2">
        📈 {title}
      </h4>
      <div className="bg-white rounded-xl border border-slate-200 p-4" style={{ height: '250px' }}>
        <Line data={data} options={options} />
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
}

export const FinalSalaryChart: React.FC<FinalSalaryChartProps> = ({ data }) => {
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
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.3,
        fill: true
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

  return (
    <div>
      <h4 className="text-sm font-bold text-slate-600 mb-4 flex items-center gap-2">
        💰 最終支給額の推移
      </h4>
      <div className="bg-white rounded-xl border border-slate-200 p-4" style={{ height: '250px' }}>
        <Line data={chartData} options={options} />
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
}

export const SalaryBreakdownChart: React.FC<SalaryBreakdownChartProps> = ({ data }) => {
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
        borderRadius: 4
      },
      {
        label: '資格手当',
        data: data.map(d => d.qualAllowance),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderRadius: 4
      },
      {
        label: '業績加算',
        data: data.map(d => d.performance),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderRadius: 4
      },
      {
        label: '勤怠控除',
        data: data.map(d => -d.deduction),
        backgroundColor: 'rgba(244, 63, 94, 0.8)',
        borderRadius: 4
      }
    ]
  };

  const options = {
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

  return (
    <div>
      <h4 className="text-sm font-bold text-slate-600 mb-4 flex items-center gap-2">
        📊 給与内訳の推移
      </h4>
      <div className="bg-white rounded-xl border border-slate-200 p-4" style={{ height: '300px' }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};
