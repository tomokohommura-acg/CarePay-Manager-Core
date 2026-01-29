import React, { useState } from 'react';
import { QualificationMapping, MasterData, BusinessType } from '../types';
import { SmartHRCustomFieldTemplate } from '../types/smarthr';

interface QualificationMappingEditorProps {
  qualificationMappings: QualificationMapping[];
  setQualificationMappings: React.Dispatch<React.SetStateAction<QualificationMapping[]>>;
  smarthrCustomFieldTemplates: SmartHRCustomFieldTemplate[];
  masters: Record<BusinessType, MasterData>;
  isLoadingMeta: boolean;
  subdomain: string;
  accessToken: string;
  onRefresh: () => void;
}

export const QualificationMappingEditor: React.FC<QualificationMappingEditorProps> = ({
  qualificationMappings,
  setQualificationMappings,
  smarthrCustomFieldTemplates,
  masters,
  isLoadingMeta,
  subdomain,
  accessToken,
  onRefresh
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType>(BusinessType.HOME_CARE);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [selectedValueId, setSelectedValueId] = useState<string | null>(null);
  const [selectedQualificationId, setSelectedQualificationId] = useState('');

  // 選択中のカスタムフィールドテンプレート
  const selectedTemplate = smarthrCustomFieldTemplates.find(t => t.id === selectedFieldId);

  // マッピング追加
  const handleAddMapping = () => {
    if (!selectedFieldId || !selectedQualificationId) return;

    const template = smarthrCustomFieldTemplates.find(t => t.id === selectedFieldId);
    if (!template) return;

    let valueName: string | null = null;
    if (selectedValueId && template.elements) {
      const element = template.elements.find(e => e.id === selectedValueId);
      valueName = element?.name || null;
    }

    const newMapping: QualificationMapping = {
      id: crypto.randomUUID(),
      smarthrFieldId: selectedFieldId,
      smarthrFieldName: template.name,
      smarthrValueId: selectedValueId,
      smarthrValueName: valueName,
      qualificationId: selectedQualificationId,
      businessType: selectedBusinessType
    };

    setQualificationMappings(prev => [...prev, newMapping]);
    setShowAddForm(false);
    setSelectedFieldId('');
    setSelectedValueId(null);
    setSelectedQualificationId('');
  };

  // マッピング削除
  const handleDeleteMapping = (id: string) => {
    setQualificationMappings(prev => prev.filter(m => m.id !== id));
  };

  // 資格名取得ヘルパー
  const getQualificationName = (qualificationId: string, businessType: BusinessType): string => {
    const qual = masters[businessType].qualifications.find(q => q.id === qualificationId);
    return qual?.name || '不明な資格';
  };

  // 業種別にマッピングをグループ化
  const homeCareMatchings = qualificationMappings.filter(m => m.businessType === BusinessType.HOME_CARE);
  const homeNursingMappings = qualificationMappings.filter(m => m.businessType === BusinessType.HOME_NURSING);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-700">カスタム項目 → 資格 マッピング</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoadingMeta || !subdomain || !accessToken}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
          >
            {isLoadingMeta ? '読込中...' : '再読込'}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            disabled={smarthrCustomFieldTemplates.length === 0}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            + マッピング追加
          </button>
        </div>
      </div>

      {!subdomain || !accessToken ? (
        <p className="text-sm text-slate-500">接続設定を入力して保存してください</p>
      ) : smarthrCustomFieldTemplates.length === 0 ? (
        <p className="text-sm text-slate-500">
          {isLoadingMeta ? 'SmartHRからカスタム項目を読み込んでいます...' : 'カスタム項目がありません'}
        </p>
      ) : (
        <div className="space-y-6">
          {/* 追加フォーム */}
          {showAddForm && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
              <h5 className="text-sm font-bold text-slate-700">新しいマッピングを追加</h5>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">業種</label>
                  <select
                    value={selectedBusinessType}
                    onChange={(e) => {
                      setSelectedBusinessType(e.target.value as BusinessType);
                      setSelectedQualificationId('');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={BusinessType.HOME_CARE}>訪問介護</option>
                    <option value={BusinessType.HOME_NURSING}>訪問看護</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">SmartHRカスタム項目</label>
                  <select
                    value={selectedFieldId}
                    onChange={(e) => {
                      setSelectedFieldId(e.target.value);
                      setSelectedValueId(null);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- 選択 --</option>
                    {smarthrCustomFieldTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.type})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTemplate?.type === 'enum' && selectedTemplate.elements && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">項目の値（選択肢）</label>
                    <select
                      value={selectedValueId || ''}
                      onChange={(e) => setSelectedValueId(e.target.value || null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- いずれかの値がある場合 --</option>
                      {selectedTemplate.elements.map(element => (
                        <option key={element.id} value={element.id}>
                          {element.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">マッピング先の資格</label>
                  <select
                    value={selectedQualificationId}
                    onChange={(e) => setSelectedQualificationId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- 選択 --</option>
                    {masters[selectedBusinessType].qualifications.map(qual => (
                      <option key={qual.id} value={qual.id}>
                        {qual.name} (+{qual.allowance.toLocaleString()}円)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddMapping}
                  disabled={!selectedFieldId || !selectedQualificationId}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  追加
                </button>
              </div>
            </div>
          )}

          {/* 訪問介護のマッピング */}
          <div>
            <h5 className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-600">訪問介護</span>
              マッピング ({homeCareMatchings.length}件)
            </h5>
            {homeCareMatchings.length === 0 ? (
              <p className="text-xs text-slate-400">マッピングがありません</p>
            ) : (
              <div className="space-y-1">
                {homeCareMatchings.map(mapping => (
                  <div key={mapping.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-700">{mapping.smarthrFieldName}</span>
                      {mapping.smarthrValueName && (
                        <span className="text-slate-500">= "{mapping.smarthrValueName}"</span>
                      )}
                      <span className="text-slate-400">→</span>
                      <span className="font-medium text-indigo-600">
                        {getQualificationName(mapping.qualificationId, mapping.businessType)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteMapping(mapping.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 訪問看護のマッピング */}
          <div>
            <h5 className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600">訪問看護</span>
              マッピング ({homeNursingMappings.length}件)
            </h5>
            {homeNursingMappings.length === 0 ? (
              <p className="text-xs text-slate-400">マッピングがありません</p>
            ) : (
              <div className="space-y-1">
                {homeNursingMappings.map(mapping => (
                  <div key={mapping.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-700">{mapping.smarthrFieldName}</span>
                      {mapping.smarthrValueName && (
                        <span className="text-slate-500">= "{mapping.smarthrValueName}"</span>
                      )}
                      <span className="text-slate-400">→</span>
                      <span className="font-medium text-indigo-600">
                        {getQualificationName(mapping.qualificationId, mapping.businessType)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteMapping(mapping.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-indigo-50 rounded-xl p-4 mt-4 border border-indigo-100">
        <p className="text-xs text-indigo-700">
          <strong>ヒント:</strong> SmartHRのカスタム項目（例：「保有資格」）の値を、このシステムの資格マスタにマッピングします。
          複数のマッピングを設定すると、該当するすべての資格が職員に紐付けられます。
        </p>
      </div>
    </div>
  );
};
