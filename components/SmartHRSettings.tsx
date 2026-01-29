import React, { useState, useEffect } from 'react';
import {
  SmartHRConfig,
  DepartmentOfficeMapping,
  QualificationMapping,
  Office,
  MasterData,
  BusinessType
} from '../types';
import {
  SmartHRService,
  SmartHRApiError,
  obfuscateToken,
  deobfuscateToken
} from '../services/smarthrService';
import { QualificationMappingEditor } from './QualificationMapping';

interface SmartHRSettingsProps {
  config: SmartHRConfig;
  setConfig: React.Dispatch<React.SetStateAction<SmartHRConfig>>;
  departmentMappings: DepartmentOfficeMapping[];
  setDepartmentMappings: React.Dispatch<React.SetStateAction<DepartmentOfficeMapping[]>>;
  qualificationMappings: QualificationMapping[];
  setQualificationMappings: React.Dispatch<React.SetStateAction<QualificationMapping[]>>;
  offices: Office[];
  masters: Record<BusinessType, MasterData>;
}

export const SmartHRSettings: React.FC<SmartHRSettingsProps> = ({
  config,
  setConfig,
  departmentMappings,
  setDepartmentMappings,
  qualificationMappings,
  setQualificationMappings,
  offices,
  masters
}) => {
  const [subdomain, setSubdomain] = useState(config.subdomain);
  const [accessToken, setAccessToken] = useState(
    config.accessToken ? deobfuscateToken(config.accessToken) : ''
  );
  const [storeToken, setStoreToken] = useState(config.storeToken);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeSection, setActiveSection] = useState<'connection' | 'departments' | 'qualifications'>('connection');

  // SmartHRから取得したデータ
  const [smarthrDepartments, setSmarthrDepartments] = useState<{ id: string; name: string; full_path_name: string }[]>([]);
  const [smarthrEmploymentTypes, setSmarthrEmploymentTypes] = useState<{ id: string; name: string }[]>([]);
  const [smarthrCustomFieldTemplates, setSmarthrCustomFieldTemplates] = useState<any[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);

  // 設定保存
  const handleSaveConfig = () => {
    setConfig({
      subdomain,
      accessToken: storeToken ? obfuscateToken(accessToken) : '',
      employmentTypeFilter: config.employmentTypeFilter,
      lastSyncedAt: config.lastSyncedAt,
      storeToken
    });
    alert('接続設定を保存しました');
  };

  // 接続テスト
  const handleTestConnection = async () => {
    if (!subdomain || !accessToken) {
      setTestResult({ success: false, message: 'サブドメインとアクセストークンを入力してください' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const service = new SmartHRService(subdomain, accessToken);
      await service.testConnection();
      setTestResult({ success: true, message: '接続に成功しました' });
    } catch (error) {
      if (error instanceof SmartHRApiError) {
        setTestResult({ success: false, message: error.message });
      } else {
        setTestResult({ success: false, message: 'インターネット接続を確認してください' });
      }
    } finally {
      setIsTesting(false);
    }
  };

  // SmartHRメタデータ取得
  const loadSmartHRMetadata = async () => {
    if (!subdomain || !accessToken) return;

    setIsLoadingMeta(true);
    try {
      const service = new SmartHRService(subdomain, accessToken);
      const [depts, empTypes, templates] = await Promise.all([
        service.getDepartments(),
        service.getEmploymentTypes(),
        service.getCustomFieldTemplates()
      ]);
      setSmarthrDepartments(depts);
      setSmarthrEmploymentTypes(empTypes);
      setSmarthrCustomFieldTemplates(templates);
    } catch (error) {
      console.error('Failed to load SmartHR metadata:', error);
    } finally {
      setIsLoadingMeta(false);
    }
  };

  // 部署マッピング更新
  const handleDepartmentMappingChange = (deptId: string, deptName: string, officeId: string) => {
    setDepartmentMappings(prev => {
      const existing = prev.find(m => m.smarthrDepartmentId === deptId);
      if (officeId === '') {
        return prev.filter(m => m.smarthrDepartmentId !== deptId);
      }
      if (existing) {
        return prev.map(m =>
          m.smarthrDepartmentId === deptId
            ? { ...m, officeId }
            : m
        );
      }
      return [...prev, {
        smarthrDepartmentId: deptId,
        smarthrDepartmentName: deptName,
        officeId
      }];
    });
  };

  // 雇用形態フィルター更新
  const toggleEmploymentType = (typeId: string) => {
    setConfig(prev => {
      const current = prev.employmentTypeFilter;
      if (current.includes(typeId)) {
        return { ...prev, employmentTypeFilter: current.filter(id => id !== typeId) };
      }
      return { ...prev, employmentTypeFilter: [...current, typeId] };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-lg">
            <img src="https://smarthr.co.jp/favicon.ico" alt="SmartHR" className="w-5 h-5" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.textContent = ''; }} />
          </span>
          SmartHR API 連携設定
        </h3>
      </div>

      {/* セクションタブ */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSection('connection')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSection === 'connection'
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          接続設定
        </button>
        <button
          onClick={() => { setActiveSection('departments'); loadSmartHRMetadata(); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSection === 'departments'
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          部署マッピング
        </button>
        <button
          onClick={() => { setActiveSection('qualifications'); loadSmartHRMetadata(); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSection === 'qualifications'
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          資格マッピング
        </button>
      </div>

      {/* 接続設定 */}
      {activeSection === 'connection' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              SmartHR サブドメイン
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">https://</span>
              <input
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="your-company"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="text-slate-400">.smarthr.jp</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              アクセストークン
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="APIアクセストークンを入力"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              SmartHR管理画面の「アプリ連携 &gt; APIアクセストークン」から発行してください
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="storeToken"
              checked={storeToken}
              onChange={(e) => setStoreToken(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="storeToken" className="text-sm text-slate-600">
              トークンをブラウザに保存する（保存しない場合はセッション終了時に削除）
            </label>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {isTesting ? 'テスト中...' : '接続テスト'}
            </button>
            <button
              onClick={handleSaveConfig}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
            >
              設定を保存
            </button>
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg ${testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {testResult.success ? '✓' : '✗'} {testResult.message}
            </div>
          )}

          <div className="border-t border-slate-200 pt-6 mt-6">
            <h4 className="text-sm font-bold text-slate-700 mb-4">同期対象の雇用形態</h4>
            {smarthrEmploymentTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {smarthrEmploymentTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => toggleEmploymentType(type.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      config.employmentTypeFilter.includes(type.id)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                接続テスト成功後、部署マッピングタブを開くと雇用形態一覧が表示されます
              </p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              選択した雇用形態の従業員のみ同期されます。未選択の場合はすべての従業員が対象になります。
            </p>
          </div>
        </div>
      )}

      {/* 部署マッピング */}
      {activeSection === 'departments' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-700">部署 → 事業所 マッピング</h4>
            <button
              onClick={loadSmartHRMetadata}
              disabled={isLoadingMeta || !subdomain || !accessToken}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
            >
              {isLoadingMeta ? '読込中...' : '再読込'}
            </button>
          </div>

          {!subdomain || !accessToken ? (
            <p className="text-sm text-slate-500">接続設定を入力して保存してください</p>
          ) : smarthrDepartments.length === 0 ? (
            <p className="text-sm text-slate-500">
              {isLoadingMeta ? 'SmartHRから部署情報を読み込んでいます...' : '部署情報がありません'}
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {smarthrDepartments.map(dept => {
                const mapping = departmentMappings.find(m => m.smarthrDepartmentId === dept.id);
                return (
                  <div key={dept.id} className="flex items-center gap-4 py-2 border-b border-slate-100 last:border-0">
                    <div className="flex-1">
                      <span className="text-sm text-slate-700">{dept.full_path_name || dept.name}</span>
                    </div>
                    <span className="text-slate-400">→</span>
                    <select
                      value={mapping?.officeId || ''}
                      onChange={(e) => handleDepartmentMappingChange(dept.id, dept.name, e.target.value)}
                      className="w-48 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- 未設定 --</option>
                      {offices.map(office => (
                        <option key={office.id} value={office.id}>
                          {office.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-amber-50 rounded-xl p-4 mt-4 border border-amber-100">
            <p className="text-xs text-amber-700">
              <strong>ヒント:</strong> マッピングが未設定の部署に所属する従業員は同期時にスキップされます。
            </p>
          </div>
        </div>
      )}

      {/* 資格マッピング */}
      {activeSection === 'qualifications' && (
        <QualificationMappingEditor
          qualificationMappings={qualificationMappings}
          setQualificationMappings={setQualificationMappings}
          smarthrCustomFieldTemplates={smarthrCustomFieldTemplates}
          masters={masters}
          isLoadingMeta={isLoadingMeta}
          subdomain={subdomain}
          accessToken={accessToken}
          onRefresh={loadSmartHRMetadata}
        />
      )}

      {/* 最終同期日時 */}
      {config.lastSyncedAt && (
        <div className="text-sm text-slate-500 text-right">
          最終同期: {new Date(config.lastSyncedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};
