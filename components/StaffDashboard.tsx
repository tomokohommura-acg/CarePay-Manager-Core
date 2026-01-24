
import React from 'react';
import { EvaluationRecord, MasterData, StaffUpdateData, HistoryEntry, QualificationMaster } from '../types';

interface StaffDashboardProps {
  record: EvaluationRecord;
  master: MasterData;
  input: StaffUpdateData;
  history: HistoryEntry[];
  onClose: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ 
  record, 
  master, 
  input, 
  history, 
  onClose 
}) => {
  // 当該職員の過去履歴を抽出し、日付順にソート
  const staffHistory = history
    .filter(h => h.recordsSnapshot[`${h.period.id}_${record.staffId}`] || h.recordsSnapshot[record.staffId])
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // 現在の計算
  const primaryQual = record.qualifications
    .map(qId => master.qualifications.find(mq => mq.id === qId))
    .filter((q): q is QualificationMaster => !!q)
    .sort((a, b) => a.priority - b.priority)[0];

  const qualAllowance = primaryQual ? primaryQual.allowance : 0;
  
  const deductions = master.attendanceConditions
    .map(c => ({ name: c.name, amount: (input.attendanceInputs[c.id] || 0) * c.unitAmount, units: input.attendanceInputs[c.id] || 0, label: c.unitLabel }))
    .filter(d => d.amount > 0);

  const additions = master.performanceEvaluations
    .map(p => ({ name: p.name, amount: (input.performanceInputs[p.id] || 0) * p.unitAmount, units: input.performanceInputs[p.id] || 0, label: p.unitLabel }))
    .filter(a => a.amount !== 0);

  const totalDeduction = deductions.reduce((sum, d) => sum + d.amount, 0);
  const totalAddition = additions.reduce((sum, a) => sum + a.amount, 0);
  const finalSalary = record.baseSalary + qualAllowance - totalDeduction + totalAddition;

  // 次に狙える資格
  const nextQual = master.qualifications
    .filter(q => !record.qualifications.includes(q.id))
    .sort((a, b) => a.priority - b.priority)[0];

  // 履歴エントリから計算を行うヘルパー
  const calculatePastSalary = (entry: HistoryEntry) => {
    // 期間ID付きキーまたは単体IDキーの両方を考慮
    const keyWithPeriod = `${entry.period.id}_${record.staffId}`;
    const hRecord = entry.recordsSnapshot[keyWithPeriod] || entry.recordsSnapshot[record.staffId];
    const hInput = entry.inputs[keyWithPeriod] || entry.inputs[record.staffId];
    
    if (!hRecord) return null;

    const hPrimaryQual = hRecord.qualifications
      .map(qId => entry.masterSnapshot.qualifications.find(mq => mq.id === qId))
      .filter((q): q is any => !!q)
      .sort((a, b) => a.priority - b.priority)[0];
    
    const hQualAllowance = hPrimaryQual ? hPrimaryQual.allowance : 0;
    
    let hDeduction = 0;
    if (hInput) {
      entry.masterSnapshot.attendanceConditions.forEach(c => {
        hDeduction += (hInput.attendanceInputs[c.id] || 0) * c.unitAmount;
      });
    }

    let hAddition = 0;
    if (hInput) {
      entry.masterSnapshot.performanceEvaluations.forEach(p => {
        hAddition += (hInput.performanceInputs[p.id] || 0) * p.unitAmount;
      });
    }

    return hRecord.baseSalary + hQualAllowance - hDeduction + hAddition;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-white px-8 py-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-200">👤</div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-black text-slate-800">{record.name}</h3>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">Staff ID: {record.staffId.slice(0,8)}</span>
              </div>
              <p className="text-sm text-slate-500 font-medium">職員個別パフォーマンス・履歴分析</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Current Status & Breakdown */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Salary Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">現在の基準給与</span>
                  <div className="text-2xl font-black text-slate-800">¥{(record.baseSalary + qualAllowance).toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    適用資格: {primaryQual?.name || 'なし'}
                  </div>
                </div>
                <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 shadow-sm">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-1">今期 減額合計</span>
                  <div className="text-2xl font-black text-rose-600">-¥{totalDeduction.toLocaleString()}</div>
                  <div className="text-[10px] text-rose-500 mt-1">{deductions.length} 項目が適用中</div>
                </div>
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block mb-1">今期 加算合計</span>
                  <div className="text-2xl font-black text-emerald-600">+¥{totalAddition.toLocaleString()}</div>
                  <div className="text-[10px] text-emerald-500 mt-1">{additions.length} 項目が評価中</div>
                </div>
              </div>

              {/* Detail Table */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-700">今期支給額の内訳詳細</h4>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">最終予測支給額</span>
                    <span className="text-lg font-black text-indigo-600">¥{finalSalary.toLocaleString()}</span>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h5 className="text-xs font-bold text-rose-500 mb-4 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-rose-100 flex items-center justify-center text-[10px]">▼</span> 減額項目
                    </h5>
                    {deductions.length > 0 ? (
                      <div className="space-y-3">
                        {deductions.map((d, i) => (
                          <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                            <span className="text-slate-600">{d.name} <span className="text-[10px] text-slate-400">({d.units}{d.label})</span></span>
                            <span className="font-bold text-rose-600">-¥{d.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center">今期、減額対象の項目はありません</p>
                    )}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-500 mb-4 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">▲</span> 加算項目
                    </h5>
                    {additions.length > 0 ? (
                      <div className="space-y-3">
                        {additions.map((a, i) => (
                          <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                            <span className="text-slate-600">{a.name} <span className="text-[10px] text-slate-400">({a.units}{a.label})</span></span>
                            <span className={`font-bold ${a.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {a.amount >= 0 ? '+' : ''}¥{a.amount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center">今期、評価加算の項目はありません</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 職員個別：評価・支給履歴タイムライン */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    📈 支給履歴・パフォーマンス推移
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full">過去 {staffHistory.length} 件のデータ</span>
                </div>
                
                {staffHistory.length > 0 ? (
                  <div className="relative pl-10 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-1 before:bg-slate-100 before:rounded-full">
                    {[...staffHistory].reverse().map((h, i) => {
                      const pastSalary = calculatePastSalary(h);
                      const keyWithPeriod = `${h.period.id}_${record.staffId}`;
                      const hRecord = h.recordsSnapshot[keyWithPeriod] || h.recordsSnapshot[record.staffId];
                      
                      return (
                        <div key={h.id} className="relative group">
                          {/* Timeline Dot */}
                          <div className={`absolute -left-[32px] top-1 w-6 h-6 rounded-full border-4 border-white shadow-md z-10 transition-transform group-hover:scale-125 ${i === 0 ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                          
                          <div className="bg-slate-50/50 group-hover:bg-indigo-50/30 rounded-2xl p-5 border border-slate-100 group-hover:border-indigo-100 transition-all">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-black text-indigo-600">{h.period.name}</span>
                                  <span className="text-[10px] text-slate-400 font-bold border-l pl-2 border-slate-200">{h.timestamp} 保存</span>
                                </div>
                                <div className="text-sm font-bold text-slate-700">
                                  {hRecord?.qualifications.map(qId => h.masterSnapshot.qualifications.find(mq => mq.id === qId)?.name).filter(Boolean).join(', ') || '資格なし'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-slate-400 font-bold">支給実績額</div>
                                <div className="text-xl font-black text-slate-800">¥{pastSalary?.toLocaleString()}</div>
                              </div>
                            </div>
                            
                            {/* Summary mini breakdown in timeline */}
                            <div className="mt-4 flex gap-4 text-[10px]">
                              <div className="text-slate-500">基本給: ¥{hRecord?.baseSalary.toLocaleString()}</div>
                              {pastSalary && hRecord && (
                                <div className={`font-bold ${pastSalary >= hRecord.baseSalary ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {pastSalary >= hRecord.baseSalary ? '手当・評価加算あり' : '控除あり'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30">
                    <div className="text-4xl mb-2 opacity-20">📊</div>
                    <p className="text-slate-400 text-sm font-medium">履歴データがまだ蓄積されていません</p>
                    <p className="text-[10px] text-slate-300 mt-1">「評価を履歴保存」すると、ここに時系列データが表示されます</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Profile & Career Action */}
            <div className="space-y-6">
              {/* Career Status Card */}
              <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-white/10 text-8xl font-black rotate-12 select-none">CAREER</div>
                <h4 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  キャリア・資格ステータス
                </h4>
                <div className="space-y-6 relative z-10">
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                    <span className="text-[10px] block opacity-60 font-bold mb-1">現在の最優先適用資格</span>
                    <div className="font-black text-xl">{primaryQual?.name || '資格なし'}</div>
                  </div>
                  
                  <div>
                    <span className="text-[10px] block opacity-60 font-bold mb-2">保有資格マスターリスト</span>
                    <div className="flex flex-wrap gap-2">
                      {record.qualifications.length > 0 ? record.qualifications.map(qId => {
                        const q = master.qualifications.find(mq => mq.id === qId);
                        const isPrimary = qId === primaryQual?.id;
                        return (
                          <span key={qId} className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                            isPrimary ? 'bg-white text-indigo-600 shadow-lg' : 'bg-white/10 text-white border border-white/20'
                          }`}>
                            {isPrimary && '★ '}{q?.name || '不明'}
                          </span>
                        );
                      }) : <span className="text-[10px] opacity-40 italic">登録されている資格はありません</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Career Step */}
              {nextQual && (
                <div className="bg-white rounded-3xl border border-indigo-100 p-6 shadow-sm group hover:border-indigo-300 transition-all cursor-default">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl shadow-sm">🚀</div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">次なる昇給チャンス</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Next Step</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    未取得の「<span className="text-indigo-600 font-black">{nextQual.name}</span>」を取得すると、月額給与がさらに <span className="text-emerald-600 font-black underline decoration-emerald-200 underline-offset-4">¥{(nextQual.allowance - qualAllowance).toLocaleString()}</span> アップする可能性があります。
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400">取得進捗イメージ</span>
                      <span className="text-indigo-600">Challenge!</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full w-1/3 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Private Admin Notes */}
              <div className="bg-slate-800 rounded-3xl p-6 text-white shadow-lg">
                <h4 className="text-xs font-bold opacity-50 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <span className="text-sm">📝</span> 管理者用メモ
                </h4>
                <textarea 
                  className="w-full bg-slate-700/40 border border-slate-700 rounded-2xl text-xs p-4 min-h-[120px] outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500"
                  placeholder="面談記録、評価の特記事項、今後の期待される役割などを入力..."
                ></textarea>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-[9px] text-slate-500">※このメモは職員本人には公開されません</span>
                  <button className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-[10px] font-black transition-all shadow-lg shadow-indigo-900/20">
                    メモを保存
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-white border border-slate-200 p-4 rounded-2xl text-center hover:bg-slate-50 transition-all group">
                  <div className="text-xl mb-1 group-hover:scale-110 transition-transform">📄</div>
                  <div className="text-[10px] font-bold text-slate-600">個別票出力</div>
                </button>
                <button className="bg-white border border-slate-200 p-4 rounded-2xl text-center hover:bg-slate-50 transition-all group">
                  <div className="text-xl mb-1 group-hover:scale-110 transition-transform">📧</div>
                  <div className="text-[10px] font-bold text-slate-600">本人へ通知</div>
                </button>
              </div>
            </div>

          </div>
        </div>
        
        {/* Footer info */}
        <div className="bg-slate-100/50 px-8 py-3 border-t border-slate-200 text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            データの正確性については、各期間保存時のマスタ設定および入力値に基づきます。
          </p>
        </div>
      </div>
    </div>
  );
};
