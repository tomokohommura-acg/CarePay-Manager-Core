import React, { useState, useEffect } from 'react';
import {
  SmartHRConfig,
  DepartmentOfficeMapping,
  QualificationMapping,
  Office,
  Staff,
  MasterData,
  BusinessType,
  SmartHRSyncPreview
} from '../types';
import { SmartHRCrew } from '../types/smarthr';
import {
  SmartHRService,
  SmartHRApiError,
  deobfuscateToken,
  generateSyncPreview,
  executeSyncItems
} from '../services/smarthrService';

interface SmartHRSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  config: SmartHRConfig;
  setConfig: React.Dispatch<React.SetStateAction<SmartHRConfig>>;
  departmentMappings: DepartmentOfficeMapping[];
  qualificationMappings: QualificationMapping[];
  offices: Office[];
  masters: Record<BusinessType, MasterData>;
  staffList: Staff[];
  setStaffList: React.Dispatch<React.SetStateAction<Staff[]>>;
  // トークンがメモリにのみ保存されている場合に使用
  memoryToken?: string;
  // 職員名簿へ遷移（未設定フィルターON）
  onNavigateToStaffList?: (showUnconfiguredOnly: boolean) => void;
}

export const SmartHRSyncDialog: React.FC<SmartHRSyncDialogProps> = ({
  isOpen,
  onClose,
  config,
  setConfig,
  onNavigateToStaffList,
  departmentMappings,
  qualificationMappings,
  offices,
  masters,
  staffList,
  setStaffList,
  memoryToken
}) => {
  const [step, setStep] = useState<'loading' | 'preview' | 'syncing' | 'done' | 'error'>('loading');
  const [preview, setPreview] = useState<SmartHRSyncPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ added: number; updated: number; statusChanged: number } | null>(null);
  const [selectedTab, setSelectedTab] = useState<'add' | 'update' | 'statusChanges' | 'skipped'>('add');
  const [expandedSkipped, setExpandedSkipped] = useState(false);

  // ダイアログが開かれたときにプレビューを取得
  useEffect(() => {
    if (isOpen) {
      loadPreview();
    } else {
      // リセット
      setStep('loading');
      setPreview(null);
      setError(null);
      setSyncResult(null);
    }
  }, [isOpen]);

  const loadPreview = async () => {
    setStep('loading');
    setError(null);

    const token = memoryToken || (config.accessToken ? deobfuscateToken(config.accessToken) : '');

    if (!config.subdomain || !token) {
      setError('SmartHR接続設定が未完了です。設定画面から接続情報を入力してください。');
      setStep('error');
      return;
    }

    try {
      const service = new SmartHRService(config.subdomain, token);
      const crews = await service.getAllCrews();

      const qualificationMasters: Record<BusinessType, typeof masters[BusinessType]['qualifications']> = {
        [BusinessType.HOME_CARE]: masters[BusinessType.HOME_CARE].qualifications,
        [BusinessType.HOME_NURSING]: masters[BusinessType.HOME_NURSING].qualifications
      };

      const previewData = generateSyncPreview(
        crews,
        config.employmentTypeFilter,
        departmentMappings,
        qualificationMappings,
        offices,
        qualificationMasters,
        staffList
      );

      setPreview(previewData);
      setStep('preview');
    } catch (err) {
      if (err instanceof SmartHRApiError) {
        setError(err.message);
      } else {
        setError('インターネット接続を確認してください');
      }
      setStep('error');
    }
  };

  const handleSync = async () => {
    if (!preview) return;

    setStep('syncing');

    try {
      // 新規追加
      let updatedStaffList = executeSyncItems(preview.toAdd, staffList, false);
      // 更新
      updatedStaffList = executeSyncItems(preview.toUpdate, updatedStaffList, true);

      // 退職・雇用形態変更の処理
      for (const change of preview.statusChanges) {
        const index = updatedStaffList.findIndex(s => s.id === change.staffId);
        if (index >= 0) {
          if (change.changeType === 'resigned' && change.resignedAt) {
            // 退職日を設定
            updatedStaffList[index] = {
              ...updatedStaffList[index],
              resignedAt: change.resignedAt,
              smarthrSyncedAt: new Date().toISOString()
            };
          } else if (change.changeType === 'employment_type_changed') {
            // 雇用形態変更のフラグを記録（退職はしていないが同期対象外になった）
            updatedStaffList[index] = {
              ...updatedStaffList[index],
              smarthrSyncedAt: new Date().toISOString()
            };
          }
        }
      }

      setStaffList(updatedStaffList);
      setConfig(prev => ({
        ...prev,
        lastSyncedAt: new Date().toISOString()
      }));

      setSyncResult({
        added: preview.toAdd.length,
        updated: preview.toUpdate.length,
        statusChanged: preview.statusChanges.length
      });
      setStep('done');
    } catch (err) {
      setError('同期処理中にエラーが発生しました');
      setStep('error');
    }
  };

  const getQualificationNames = (qualificationIds: string[], officeId: string): string => {
    const office = offices.find(o => o.id === officeId);
    if (!office) return '';
    const qualMasters = masters[office.type].qualifications;
    return qualificationIds
      .map(id => qualMasters.find(q => q.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <span className="text-lg">🔄</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">SmartHRから職員を同期</h3>
              <p className="text-xs text-slate-500">従業員データを取得して職員名簿に反映します</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ローディング */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600">SmartHRからデータを取得しています...</p>
            </div>
          )}

          {/* エラー */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mb-4">!</div>
              <p className="text-rose-600 font-medium mb-2">エラーが発生しました</p>
              <p className="text-slate-500 text-sm text-center">{error}</p>
              <button
                onClick={loadPreview}
                className="mt-6 px-6 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                再試行
              </button>
            </div>
          )}

          {/* プレビュー */}
          {step === 'preview' && preview && (
            <div className="space-y-6">
              {/* サマリー */}
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => setSelectedTab('add')}
                  className={`p-3 rounded-xl border-2 transition-colors ${
                    selectedTab === 'add'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl font-bold text-emerald-600">{preview.toAdd.length}</div>
                  <div className="text-xs text-slate-600">新規追加</div>
                </button>
                <button
                  onClick={() => setSelectedTab('update')}
                  className={`p-3 rounded-xl border-2 transition-colors ${
                    selectedTab === 'update'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl font-bold text-blue-600">{preview.toUpdate.length}</div>
                  <div className="text-xs text-slate-600">更新</div>
                </button>
                <button
                  onClick={() => setSelectedTab('statusChanges')}
                  className={`p-3 rounded-xl border-2 transition-colors ${
                    selectedTab === 'statusChanges'
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl font-bold text-rose-600">{preview.statusChanges.length}</div>
                  <div className="text-xs text-slate-600">退職・変更</div>
                </button>
                <button
                  onClick={() => setSelectedTab('skipped')}
                  className={`p-3 rounded-xl border-2 transition-colors ${
                    selectedTab === 'skipped'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl font-bold text-amber-600">{preview.skipped.length}</div>
                  <div className="text-xs text-slate-600">スキップ</div>
                </button>
              </div>

              {/* 詳細リスト */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <span className="text-sm font-bold text-slate-700">
                    {selectedTab === 'add' && '新規追加される職員'}
                    {selectedTab === 'update' && '更新される職員'}
                    {selectedTab === 'statusChanges' && '退職・雇用形態変更'}
                    {selectedTab === 'skipped' && 'スキップされる従業員'}
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {selectedTab === 'add' && (
                    preview.toAdd.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">該当なし</div>
                    ) : (
                      preview.toAdd.map(item => (
                        <div key={item.smarthrCrewId} className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0">
                          <div>
                            <div className="font-medium text-slate-700">{item.name}</div>
                            <div className="text-xs text-slate-500">
                              {item.empCode && <span className="mr-2">社員番号: {item.empCode}</span>}
                              → {item.officeName}
                              {item.qualifications.length > 0 && (
                                <span className="ml-2 text-indigo-600">
                                  資格: {getQualificationNames(item.qualifications, item.officeId)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded text-xs font-medium">追加</span>
                        </div>
                      ))
                    )
                  )}
                  {selectedTab === 'update' && (
                    preview.toUpdate.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">該当なし</div>
                    ) : (
                      preview.toUpdate.map(item => (
                        <div key={item.smarthrCrewId} className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0">
                          <div>
                            <div className="font-medium text-slate-700">{item.name}</div>
                            <div className="text-xs text-slate-500">
                              {item.empCode && <span className="mr-2">社員番号: {item.empCode}</span>}
                              → {item.officeName}
                              {item.qualifications.length > 0 && (
                                <span className="ml-2 text-indigo-600">
                                  資格: {getQualificationNames(item.qualifications, item.officeId)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs font-medium">更新</span>
                        </div>
                      ))
                    )
                  )}
                  {selectedTab === 'statusChanges' && (
                    preview.statusChanges.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">該当なし</div>
                    ) : (
                      preview.statusChanges.map(item => (
                        <div key={item.staffId} className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0">
                          <div>
                            <div className="font-medium text-slate-700">{item.name}</div>
                            <div className="text-xs text-slate-500">
                              {item.empCode && <span className="mr-2">社員番号: {item.empCode}</span>}
                              <span className="text-rose-600">{item.changeDetail}</span>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.changeType === 'resigned'
                              ? 'bg-rose-100 text-rose-600'
                              : 'bg-amber-100 text-amber-600'
                          }`}>
                            {item.changeType === 'resigned' ? '退職' : '雇用形態変更'}
                          </span>
                        </div>
                      ))
                    )
                  )}
                  {selectedTab === 'skipped' && (
                    preview.skipped.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">該当なし</div>
                    ) : (
                      <>
                        {preview.skipped.slice(0, expandedSkipped ? undefined : 10).map(item => (
                          <div key={item.smarthrCrewId} className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0">
                            <div>
                              <div className="font-medium text-slate-700">{item.name}</div>
                              <div className="text-xs text-slate-500">
                                {item.empCode && <span className="mr-2">社員番号: {item.empCode}</span>}
                              </div>
                            </div>
                            <span className="text-xs text-amber-600">{item.reason}</span>
                          </div>
                        ))}
                        {preview.skipped.length > 10 && !expandedSkipped && (
                          <button
                            onClick={() => setExpandedSkipped(true)}
                            className="w-full p-2 text-center text-indigo-600 text-sm hover:bg-slate-50"
                          >
                            他 {preview.skipped.length - 10} 件を表示
                          </button>
                        )}
                      </>
                    )
                  )}
                </div>
              </div>

              {preview.toAdd.length === 0 && preview.toUpdate.length === 0 && preview.statusChanges.length === 0 && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <p className="text-sm text-amber-700">
                    同期対象の従業員がいません。部署マッピングや雇用形態フィルタの設定を確認してください。
                  </p>
                </div>
              )}

              {preview.statusChanges.length > 0 && (
                <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                  <p className="text-sm text-rose-700">
                    <strong>注意:</strong> 退職・雇用形態変更の職員がいます。同期を実行すると、退職日が設定されます。職員データは削除されず履歴として残ります。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 同期中 */}
          {step === 'syncing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600">職員名簿を更新しています...</p>
            </div>
          )}

          {/* 完了 */}
          {step === 'done' && syncResult && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-3xl mb-4">✓</div>
              <p className="text-emerald-600 font-bold text-lg mb-2">同期が完了しました</p>
              <p className="text-slate-500 text-sm text-center">
                {syncResult.added > 0 && `${syncResult.added}名を新規追加`}
                {syncResult.added > 0 && (syncResult.updated > 0 || syncResult.statusChanged > 0) && '、'}
                {syncResult.updated > 0 && `${syncResult.updated}名を更新`}
                {syncResult.updated > 0 && syncResult.statusChanged > 0 && '、'}
                {syncResult.statusChanged > 0 && `${syncResult.statusChanged}名の退職・変更を反映`}
                {syncResult.added === 0 && syncResult.updated === 0 && syncResult.statusChanged === 0 && '変更はありませんでした'}
              </p>
              {syncResult.added > 0 && (
                <div className="mt-6 bg-amber-50 rounded-xl p-4 border border-amber-100 max-w-md">
                  <p className="text-sm text-amber-700 text-center">
                    <strong>次のステップ:</strong><br />
                    新規追加された{syncResult.added}名の<strong>基本給</strong>を設定してください。<br />
                    基本給はSmartHRから取得できないため、手動での設定が必要です。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          {step === 'preview' && preview && (preview.toAdd.length > 0 || preview.toUpdate.length > 0 || preview.statusChanges.length > 0) && (
            <button
              onClick={handleSync}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
            >
              同期を実行
            </button>
          )}
          {step === 'done' && syncResult && syncResult.added > 0 && onNavigateToStaffList && (
            <button
              onClick={() => {
                onNavigateToStaffList(true);
                onClose();
              }}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
            >
              基本給を設定する
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
          >
            {step === 'done' ? '閉じる' : 'キャンセル'}
          </button>
        </div>
      </div>
    </div>
  );
};
