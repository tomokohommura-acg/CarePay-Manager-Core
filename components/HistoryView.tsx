
import React from 'react';
import { HistoryEntry } from '../types';

interface HistoryViewProps {
  history: HistoryEntry[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, setHistory }) => {
  const handleDelete = (id: string) => {
    if (window.confirm("この履歴を削除しますか？")) {
      setHistory(prev => prev.filter(h => h.id !== id));
    }
  };

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">履歴はまだありません</h3>
        <p className="text-slate-500">「評価データ入力」画面から評価結果を保存してください。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-slate-800 mb-6">保存された評価履歴</h3>
      <div className="grid grid-cols-1 gap-4">
        {history.map(entry => (
          <div key={entry.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:border-indigo-300 transition-all group">
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">保存日時: {entry.timestamp}</span>
                  <h4 className="font-bold text-slate-800 text-lg">{entry.officeName}</h4>
                </div>
                <div className="flex gap-8">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">評価期間</span>
                    <span className="text-sm font-medium text-slate-600">{entry.period.evaluationStart} 〜 {entry.period.evaluationEnd}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase block">反映期間</span>
                    <span className="text-sm font-bold text-indigo-600">{entry.period.paymentStart} 〜 {entry.period.paymentEnd}</span>
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
    </div>
  );
};
