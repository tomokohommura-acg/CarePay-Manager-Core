
import React, { useState } from 'react';
import { Staff, MasterData } from '../types';

interface StaffManagerProps {
  staffList: Staff[];
  setStaffList: React.Dispatch<React.SetStateAction<Staff[]>>;
  selectedOfficeId: string;
  master: MasterData;
}

export const StaffManager: React.FC<StaffManagerProps> = ({
  staffList,
  setStaffList,
  selectedOfficeId,
  master
}) => {
  const [deleteTargetId, setDeleteTargetId] = useState<{id: string, name: string} | null>(null);
  const officeStaff = staffList.filter(s => s.officeId === selectedOfficeId);

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

  const handleAddStaff = () => {
    const newStaff: Staff = {
      id: crypto.randomUUID(),
      officeId: selectedOfficeId,
      name: '新職員',
      baseSalary: 200000,
      qualifications: []
    };
    setStaffList(prev => [...prev, newStaff]);
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
        <button onClick={handleAddStaff} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"><span>+</span> 職員を新規登録</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">氏名</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">基本給 (月額)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">保有資格 (★=優先反映)</th>
              <th className="px-6 py-4 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {officeStaff.map(s => {
              const primaryQualId = getPrimaryQualId(s.qualifications);
              return (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <input type="text" value={s.name} onChange={(e) => handleUpdateStaff(s.id, 'name', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 font-medium text-slate-700 p-0" placeholder="氏名を入力" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-sm">¥</span>
                      <input type="number" value={s.baseSalary} onChange={(e) => handleUpdateStaff(s.id, 'baseSalary', Number(e.target.value))} className="w-32 bg-transparent border-none focus:ring-0 font-bold text-slate-800 p-0" step="1000" />
                    </div>
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
                                ? 'bg-indigo-600 border-indigo-700 text-white font-black shadow-sm ring-2 ring-indigo-200 ring-offset-1' 
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
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setDeleteTargetId({id: s.id, name: s.name})} className="text-slate-300 hover:text-rose-500 transition-colors p-2" title="削除">🗑️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <p className="text-xs text-indigo-600 flex items-start gap-2">
          <span className="mt-0.5">ℹ️</span>
          <span>
            資格が複数ある場合、マスタで設定された「優先順位」に基づき最上位の資格（★印）1つのみが給与に反映されます。
            SmartHR等から連携される際も、この優先順位マスタに従って自動選定されます。
          </span>
        </p>
      </div>
    </div>
  );
};
