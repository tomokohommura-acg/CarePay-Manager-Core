
import React, { useState } from 'react';
import { HistoryEntry, ChangeLogEntry } from '../types';

interface HistoryViewProps {
  history: HistoryEntry[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  changeLogs?: ChangeLogEntry[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, setHistory, changeLogs = [] }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'changelog'>('history');

  const handleDelete = (id: string) => {
    if (window.confirm("この履歴を削除しますか？")) {
      setHistory(prev => prev.filter(h => h.id !== id));
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatValue = (value: number | string, field: string): string => {
    if (typeof value === 'number') {
      if (field.startsWith('attendance_') || field.startsWith('performance_')) {
        return `${value}`;
      }
      return `¥${value.toLocaleString()}`;
    }
    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* タブ切り替え */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-[#26519f] text-white shadow-lg shadow-blue-100'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          📋 評価履歴
        </button>
        <button
          onClick={() => setActiveTab('changelog')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'changelog'
              ? 'bg-[#26519f] text-white shadow-lg shadow-blue-100'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          📝 変更ログ
          {changeLogs.length > 0 && (
            <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">{changeLogs.length}</span>
          )}
        </button>
      </div>

      {/* 評価履歴タブ */}
      {activeTab === 'history' && (
        <>
          {history.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">履歴はまだありません</h3>
              <p className="text-slate-500">「評価データ入力」画面から評価結果を保存してください。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {history.map(entry => (
                <div key={entry.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:border-[#26519f]/40 transition-all group">
                  <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-[#26519f]/10 text-[#26519f] text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">保存日時: {entry.timestamp}</span>
                        <h4 className="font-bold text-slate-800 text-lg">{entry.officeName}</h4>
                      </div>
                      <div className="flex gap-8">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">評価期間</span>
                          <span className="text-sm font-medium text-slate-600">{entry.period.evaluationStart} 〜 {entry.period.evaluationEnd}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#26519f]/70 font-bold uppercase block">反映期間</span>
                          <span className="text-sm font-bold text-[#26519f]">{entry.period.paymentStart} 〜 {entry.period.paymentEnd}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="bg-white text-rose-500 border border-rose-100 px-4 py-2 rounded-xl text-sm font-bold hover:bg-rose-50 transition-all"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                      評価対象職員数: <span className="font-bold text-slate-700">{Object.keys(entry.recordsSnapshot).length}名</span> |
                      資格マスタ: {entry.masterSnapshot.qualifications.length}項目 |
                      評価マスタ: {entry.masterSnapshot.performanceEvaluations.length}項目
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 変更ログタブ */}
      {activeTab === 'changelog' && (
        <>
          {changeLogs.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">変更ログはまだありません</h3>
              <p className="text-slate-500">評価データを変更して保存すると、変更内容がここに記録されます。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {changeLogs.map(log => (
                <div key={log.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-700">{formatTimestamp(log.timestamp)}</span>
                        <span className="bg-[#26519f]/10 text-[#26519f] text-xs font-bold px-2 py-1 rounded-full">
                          {log.userName}
                        </span>
                        <span className="text-sm text-slate-500">{log.periodName}</span>
                      </div>
                      <span className="text-xs text-slate-400">{log.changes.length}件の変更</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="space-y-2">
                      {log.changes.map((change, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="text-slate-400">├─</span>
                          <span className="font-medium text-slate-700">{change.staffName}</span>
                          <span className="text-slate-500">{change.fieldName}</span>
                          <span className="text-rose-500 line-through">{formatValue(change.oldValue, change.field)}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-emerald-600 font-bold">{formatValue(change.newValue, change.field)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
