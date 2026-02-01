import React, { useState } from 'react';
import { Staff, BaseSalaryRevision } from '../types';
import {
  addBaseSalaryRevision,
  removeBaseSalaryRevision,
  sortHistoryByEffectiveMonth,
  formatMonth
} from '../utils/salaryUtils';

interface BaseSalaryHistoryEditorProps {
  staff: Staff;
  onSave: (updatedStaff: Staff) => void;
  onClose: () => void;
}

export const BaseSalaryHistoryEditor: React.FC<BaseSalaryHistoryEditorProps> = ({
  staff,
  onSave,
  onClose
}) => {
  const [localStaff, setLocalStaff] = useState<Staff>(staff);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEffectiveMonth, setNewEffectiveMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [newAmount, setNewAmount] = useState<number>(staff.baseSalary);
  const [newMemo, setNewMemo] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BaseSalaryRevision | null>(null);

  const sortedHistory = sortHistoryByEffectiveMonth(localStaff.baseSalaryHistory || []);

  const handleAddRevision = () => {
    if (!newEffectiveMonth || newAmount <= 0) return;

    const updatedStaff = addBaseSalaryRevision(localStaff, {
      effectiveMonth: newEffectiveMonth,
      amount: newAmount,
      memo: newMemo || undefined
    });

    setLocalStaff(updatedStaff);
    setShowAddForm(false);
    setNewAmount(updatedStaff.baseSalary);
    setNewMemo('');
  };

  const handleDeleteRevision = () => {
    if (!deleteTarget) return;

    const updatedStaff = removeBaseSalaryRevision(localStaff, deleteTarget.id);
    setLocalStaff(updatedStaff);
    setDeleteTarget(null);
  };

  const handleSave = () => {
    onSave(localStaff);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* ヘッダー */}
        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                💰 給与管理
              </h4>
              <p className="text-sm text-slate-500 mt-1">{staff.name}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">現在の基本給</span>
              <span className="text-xl font-bold text-indigo-600">
                ¥{localStaff.baseSalary.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="px-8 py-6 overflow-y-auto max-h-[60vh]">
          {/* 改定履歴一覧 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h5 className="text-sm font-bold text-slate-700">基本給改定履歴</h5>
              <span className="text-xs text-slate-400">{sortedHistory.length}件</span>
            </div>

            {sortedHistory.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-6 text-center">
                <p className="text-sm text-slate-500">改定履歴はまだありません</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedHistory.map((rev, index) => (
                  <div
                    key={rev.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      index === sortedHistory.length - 1
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <span className="text-xs text-slate-400 block">適用月</span>
                        <span className="text-sm font-bold text-slate-700">
                          {formatMonth(rev.effectiveMonth)}
                        </span>
                      </div>
                      <div>
                        <span className="text-lg font-bold text-slate-800">
                          ¥{rev.amount.toLocaleString()}
                        </span>
                        {rev.memo && (
                          <span className="text-xs text-slate-400 ml-2">({rev.memo})</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteTarget(rev)}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-2"
                      title="削除"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 改定追加フォーム */}
          {showAddForm ? (
            <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
              <h5 className="text-sm font-bold text-emerald-700 mb-4">新しい改定を追加</h5>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">適用月</label>
                  <input
                    type="month"
                    value={newEffectiveMonth}
                    onChange={(e) => setNewEffectiveMonth(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">金額</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                    <input
                      type="number"
                      value={newAmount}
                      onChange={(e) => setNewAmount(Number(e.target.value))}
                      className="w-full px-4 py-2 pl-8 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      step="1000"
                    />
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-2">メモ（任意）</label>
                <input
                  type="text"
                  value={newMemo}
                  onChange={(e) => setNewMemo(e.target.value)}
                  placeholder="例: 定期昇給、職務変更など"
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddRevision}
                  disabled={!newEffectiveMonth || newAmount <= 0}
                  className="flex-1 px-4 py-2 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  追加
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-3 rounded-xl font-bold text-emerald-600 bg-white border-2 border-dashed border-emerald-200 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
            >
              <span>+</span> 改定を追加
            </button>
          )}
        </div>

        {/* フッター */}
        <div className="px-8 py-6 border-t border-slate-200 bg-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg"
          >
            保存して閉じる
          </button>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                ⚠️
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">改定履歴を削除しますか？</h4>
              <p className="text-slate-500 text-sm mb-6">
                {formatMonth(deleteTarget.effectiveMonth)}の改定（¥{deleteTarget.amount.toLocaleString()}）を削除します。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteRevision}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-lg"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
