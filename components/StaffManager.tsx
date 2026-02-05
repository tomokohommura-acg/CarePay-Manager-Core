
import React, { useState } from 'react';
import { Staff, MasterData } from '../types';
import { BaseSalaryHistoryEditor } from './BaseSalaryHistoryEditor';

const DEFAULT_BASE_SALARY = 200000;

interface StaffManagerProps {
  staffList: Staff[];
  setStaffList: React.Dispatch<React.SetStateAction<Staff[]>>;
  selectedOfficeId: string;
  master: MasterData;
  onOpenSyncDialog?: () => void;
  smarthrConfigured?: boolean;
  showUnconfiguredOnly?: boolean;
  setShowUnconfiguredOnly?: (value: boolean) => void;
  canEdit?: boolean;
}

export const StaffManager: React.FC<StaffManagerProps> = ({
  staffList,
  setStaffList,
  selectedOfficeId,
  master,
  onOpenSyncDialog,
  smarthrConfigured,
  showUnconfiguredOnly = false,
  setShowUnconfiguredOnly,
  canEdit = true
}) => {
  const [deleteTargetId, setDeleteTargetId] = useState<{id: string, name: string} | null>(null);
  const [salaryEditorStaff, setSalaryEditorStaff] = useState<Staff | null>(null);

  // 基本給未設定（デフォルト値）の職員をフィルタリング
  const allOfficeStaff = staffList.filter(s => s.officeId === selectedOfficeId);
  const officeStaff = showUnconfiguredOnly
    ? allOfficeStaff.filter(s => s.baseSalary === DEFAULT_BASE_SALARY)
    : allOfficeStaff;

  const unconfiguredCount = allOfficeStaff.filter(s => s.baseSalary === DEFAULT_BASE_SALARY).length;

  const handleUpdateStaff = (staffId: string, field: keyof Staff, value: any) => {
    setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, [field]: value } : s));
  };

  const toggleStaffQualification = (staffId: string, qualId: string) => {
    setStaffList(prev => prev.map(s => {
      if (s.id !== staffId) return s;
      const qualifications = s.qualifications.includes(qualId)
        ? s.qualifications.filter(id => id !== qualId)
        : [...s.qualifications, qualId];
      return { ...s, qualifications };
    }));
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      setStaffList(prev => prev.filter(s => s.id !== deleteTargetId.id));
      setDeleteTargetId(null);
    }
  };

  // 職員が選択している資格の中で、最も優先順位(priority)が高い資格のIDを取得
  const getPrimaryQualId = (selectedQualIds: string[]) => {
    if (selectedQualIds.length === 0) return null;
    const applicableQuals = selectedQualIds
      .map(qId => master.qualifications.find(mq => mq.id === qId))
      .filter((q): q is any => !!q)
      .sort((a, b) => a.priority - b.priority); // priorityの昇順
    return applicableQuals.length > 0 ? applicableQuals[0].id : null;
  };

  const handleSalaryEditorSave = (updatedStaff: Staff) => {
    setStaffList(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));
    setSalaryEditorStaff(null);
  };

  return (
    <div className="space-y-6 relative">
      {deleteTargetId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteTargetId(null)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">👤</div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">職員を削除しますか？</h4>
              <p className="text-slate-500 text-sm mb-8">「{deleteTargetId.name}」さんの名簿データを削除します。</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTargetId(null)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">キャンセル</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200">削除する</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">👥 職員名簿・基本給管理</h3>
        {onOpenSyncDialog && (
          <button
            onClick={onOpenSyncDialog}
            disabled={!smarthrConfigured}
            title={smarthrConfigured ? 'SmartHRから従業員データを同期' : 'SmartHR連携設定を完了してください'}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              smarthrConfigured
                ? 'bg-[#00c4cc] text-white hover:bg-[#00a8b0] shadow-lg shadow-[#00c4cc]/30'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            🔄 SmartHRから同期
          </button>
        )}
      </div>

      {/* フィルター - 常に表示 */}
      {setShowUnconfiguredOnly && (
        <div className={`flex items-center justify-between rounded-xl p-4 border ${
          unconfiguredCount > 0
            ? 'bg-amber-50 border-amber-100'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            {unconfiguredCount > 0 ? (
              <>
                <span className="text-amber-600 text-lg">⚠️</span>
                <span className="text-sm text-amber-700">
                  <strong>{unconfiguredCount}名</strong>の基本給が未設定（デフォルト値: ¥{DEFAULT_BASE_SALARY.toLocaleString()}）です
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-500 text-lg">✅</span>
                <span className="text-sm text-slate-600">
                  全職員の基本給が設定済みです
                </span>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUnconfiguredOnly(false)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                !showUnconfiguredOnly
                  ? 'bg-[#26519f] text-white'
                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              全員
            </button>
            <button
              onClick={() => setShowUnconfiguredOnly(true)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                showUnconfiguredOnly
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-amber-600 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              未設定のみ ({unconfiguredCount})
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">氏名</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">社員番号</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">入社日</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">退職日</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">基本給</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">基本給更新日</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">保有資格 (★=優先反映)</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">評価対象</th>
              <th className="px-6 py-4 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {officeStaff.map(s => {
              const primaryQualId = getPrimaryQualId(s.qualifications);
              return (
                <tr key={s.id} className={`hover:bg-slate-50/50 transition-colors ${s.resignedAt ? 'opacity-50' : ''} ${s.excludedFromEvaluation ? 'bg-rose-50/50' : ''}`}>
                  <td className="px-6 py-4">
                    <input type="text" value={s.name} onChange={(e) => handleUpdateStaff(s.id, 'name', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 font-medium text-slate-700 p-0" placeholder="氏名を入力" disabled={!canEdit} />
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-slate-500 font-mono">
                      {s.smarthrEmpCode || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <input type="date" value={s.enteredAt || ''} onChange={(e) => handleUpdateStaff(s.id, 'enteredAt', e.target.value || undefined)} className="bg-transparent border-none focus:ring-0 text-sm text-slate-600 p-0" disabled={!canEdit} />
                  </td>
                  <td className="px-4 py-4">
                    <input type="date" value={s.resignedAt || ''} onChange={(e) => handleUpdateStaff(s.id, 'resignedAt', e.target.value || undefined)} className="bg-transparent border-none focus:ring-0 text-sm text-slate-600 p-0" disabled={!canEdit} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">¥{s.baseSalary.toLocaleString()}</span>
                      {(s.baseSalaryHistory?.length || 0) > 0 && (
                        <span className="text-[10px] text-slate-400">({s.baseSalaryHistory?.length}件)</span>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => setSalaryEditorStaff(s)}
                          className="text-xs px-2 py-1 rounded-lg bg-[#26519f]/10 text-[#26519f] hover:bg-[#26519f]/20 font-bold border border-[#26519f]/30"
                        >
                          給与管理
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {(() => {
                      // 最新の更新日時を取得
                      const history = s.baseSalaryHistory || [];
                      if (history.length === 0) return <span className="text-xs text-slate-400">-</span>;
                      const latestEntry = [...history].sort((a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )[0];
                      const date = new Date(latestEntry.createdAt);
                      return (
                        <div className="text-xs text-slate-600">
                          <div>{date.toLocaleDateString('ja-JP')}</div>
                          <div className="text-slate-400">{date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {master.qualifications.map(q => {
                        const isSelected = s.qualifications.includes(q.id);
                        const isPrimary = q.id === primaryQualId;
                        return (
                          <button
                            key={q.id}
                            onClick={() => toggleStaffQualification(s.id, q.id)}
                            className={`text-[10px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
                              isSelected
                              ? (isPrimary
                                ? 'bg-[#26519f] border-[#1e4080] text-white font-black shadow-sm ring-2 ring-[#26519f]/30 ring-offset-1'
                                : 'bg-slate-200 border-slate-300 text-slate-600 font-medium')
                              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            {isPrimary && <span>★</span>}
                            {q.name}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => handleUpdateStaff(s.id, 'excludedFromEvaluation', !s.excludedFromEvaluation)}
                      disabled={!canEdit}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                        s.excludedFromEvaluation
                          ? 'bg-rose-100 text-rose-600 border border-rose-300 hover:bg-rose-200'
                          : 'bg-emerald-100 text-emerald-600 border border-emerald-300 hover:bg-emerald-200'
                      } ${!canEdit ? 'cursor-not-allowed opacity-50' : ''}`}
                      title={s.excludedFromEvaluation ? '評価対象外' : '評価対象'}
                    >
                      {s.excludedFromEvaluation ? '対象外' : '対象'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setDeleteTargetId({id: s.id, name: s.name})} className="text-slate-300 hover:text-rose-500 transition-colors p-2" title="削除">🗑️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="bg-[#26519f]/10 rounded-xl p-4 border border-[#26519f]/20">
        <p className="text-xs text-[#26519f] flex items-start gap-2">
          <span className="mt-0.5">ℹ️</span>
          <span>
            資格が複数ある場合、マスタで設定された「優先順位」に基づき最上位の資格（★印）1つのみが給与に反映されます。
            SmartHR等から連携される際も、この優先順位マスタに従って自動選定されます。
          </span>
        </p>
      </div>

      {/* 給与管理モーダル */}
      {salaryEditorStaff && (
        <BaseSalaryHistoryEditor
          staff={salaryEditorStaff}
          onSave={handleSalaryEditorSave}
          onClose={() => setSalaryEditorStaff(null)}
        />
      )}
    </div>
  );
};
