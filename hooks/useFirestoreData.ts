import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Office,
  Staff,
  MasterData,
  BusinessType,
  EvaluationRecord,
  StaffUpdateData,
  HistoryEntry,
  SmartHRConfig,
  DepartmentOfficeMapping,
  QualificationMapping,
  ChangeLogEntry
} from '../types';
import {
  loadAllData,
  saveOffices,
  saveStaffList,
  saveMasters,
  saveEvaluationRecords,
  saveInputs,
  saveHistory,
  saveConfig,
  addHistoryEntry,
  addChangeLog,
  updateInput,
  migrateFromLocalStorage,
  AppData
} from '../services/firestoreService';
import { DEFAULT_MASTERS, INITIAL_STAFF, INITIAL_OFFICES } from '../constants';

const DEFAULT_SMARTHR_CONFIG: SmartHRConfig = {
  subdomain: '',
  accessToken: '',
  employmentTypeFilter: [],
  lastSyncedAt: null,
  storeToken: true
};

interface UseFirestoreDataReturn {
  // データ
  offices: Office[];
  staffList: Staff[];
  masters: Record<BusinessType, MasterData>;
  evaluationRecords: Record<string, EvaluationRecord>;
  inputs: Record<string, StaffUpdateData>;
  history: HistoryEntry[];
  changeLogs: ChangeLogEntry[];
  smarthrConfig: SmartHRConfig;
  departmentMappings: DepartmentOfficeMapping[];
  qualificationMappings: QualificationMapping[];
  selectedPeriodId: string;

  // ローディング状態
  loading: boolean;
  error: string | null;

  // セッター（Firestoreに自動保存）
  setOffices: (offices: Office[] | ((prev: Office[]) => Office[])) => void;
  setStaffList: (staff: Staff[] | ((prev: Staff[]) => Staff[])) => void;
  setMasters: (masters: Record<BusinessType, MasterData> | ((prev: Record<BusinessType, MasterData>) => Record<BusinessType, MasterData>)) => void;
  setEvaluationRecords: (records: Record<string, EvaluationRecord> | ((prev: Record<string, EvaluationRecord>) => Record<string, EvaluationRecord>)) => void;
  setInputs: (inputs: Record<string, StaffUpdateData> | ((prev: Record<string, StaffUpdateData>) => Record<string, StaffUpdateData>)) => void;
  setHistory: (history: HistoryEntry[] | ((prev: HistoryEntry[]) => HistoryEntry[])) => void;
  setSmarthrConfig: (config: SmartHRConfig | ((prev: SmartHRConfig) => SmartHRConfig)) => void;
  setDepartmentMappings: (mappings: DepartmentOfficeMapping[] | ((prev: DepartmentOfficeMapping[]) => DepartmentOfficeMapping[])) => void;
  setQualificationMappings: (mappings: QualificationMapping[] | ((prev: QualificationMapping[]) => QualificationMapping[])) => void;
  setSelectedPeriodId: (id: string) => void;

  // 個別更新関数
  handleInputChange: (data: StaffUpdateData) => void;
  handleAddHistoryEntry: (entry: HistoryEntry) => void;
  handleAddChangeLog: (entry: ChangeLogEntry) => void;

  // リロード
  reload: () => Promise<void>;
}

export function useFirestoreData(isAuthenticated: boolean): UseFirestoreDataReturn {
  const [offices, setOfficesState] = useState<Office[]>(INITIAL_OFFICES);
  const [staffList, setStaffListState] = useState<Staff[]>(INITIAL_STAFF);
  const [masters, setMastersState] = useState<Record<BusinessType, MasterData>>(DEFAULT_MASTERS);
  const [evaluationRecords, setEvaluationRecordsState] = useState<Record<string, EvaluationRecord>>({});
  const [inputs, setInputsState] = useState<Record<string, StaffUpdateData>>({});
  const [history, setHistoryState] = useState<HistoryEntry[]>([]);
  const [changeLogs, setChangeLogsState] = useState<ChangeLogEntry[]>([]);
  const [smarthrConfig, setSmarthrConfigState] = useState<SmartHRConfig>(DEFAULT_SMARTHR_CONFIG);
  const [departmentMappings, setDepartmentMappingsState] = useState<DepartmentOfficeMapping[]>([]);
  const [qualificationMappings, setQualificationMappingsState] = useState<QualificationMapping[]>([]);
  const [selectedPeriodId, setSelectedPeriodIdState] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 最新のステートを参照するためのrefを使用（セッター関数のclosure問題を解決）
  const smarthrConfigRef = useRef(smarthrConfig);
  const departmentMappingsRef = useRef(departmentMappings);
  const qualificationMappingsRef = useRef(qualificationMappings);
  const selectedPeriodIdRef = useRef(selectedPeriodId);

  // 初期データの読み込み
  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // まずFirestoreからデータを取得
      const data = await loadAllData();

      // データがなければLocalStorageから移行を試行
      if (!data.masters && !data.offices?.length) {
        console.log('No data in Firestore, attempting migration from LocalStorage...');
        const migrated = await migrateFromLocalStorage();

        if (migrated) {
          console.log('Migration successful, reloading data...');
          const newData = await loadAllData();
          applyData(newData);
        } else {
          // 初期データを使用
          console.log('No data to migrate, using initial data...');
          applyInitialData();
        }
      } else {
        applyData(data);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('データの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const applyData = (data: AppData) => {
    if (data.offices?.length) setOfficesState(data.offices);
    if (data.staffList?.length) setStaffListState(data.staffList);
    if (data.masters) setMastersState(data.masters);
    if (data.evaluationRecords) setEvaluationRecordsState(data.evaluationRecords);
    if (data.inputs) setInputsState(data.inputs);
    if (data.history) setHistoryState(data.history);
    if (data.changeLogs) setChangeLogsState(data.changeLogs);

    if (data.config) {
      const smarthrConf = data.config.smarthrConfig || DEFAULT_SMARTHR_CONFIG;
      const deptMappings = data.config.departmentMappings || [];
      const qualMappings = data.config.qualificationMappings || [];
      const periodId = data.config.selectedPeriodId || '';

      // デバッグ: Firestoreから読み込んだdepartmentMappingsを出力
      console.log('[Firestore] departmentMappings loaded:', {
        count: deptMappings.length,
        data: deptMappings
      });

      // ステートを更新
      setSmarthrConfigState(smarthrConf);
      setDepartmentMappingsState(deptMappings);
      setQualificationMappingsState(qualMappings);
      setSelectedPeriodIdState(periodId);

      // Refも同時に更新（セッター関数がすぐに呼ばれても正しい値を使えるように）
      smarthrConfigRef.current = smarthrConf;
      departmentMappingsRef.current = deptMappings;
      qualificationMappingsRef.current = qualMappings;
      selectedPeriodIdRef.current = periodId;
    }
  };

  const applyInitialData = () => {
    setOfficesState(INITIAL_OFFICES);
    setStaffListState(INITIAL_STAFF);
    setMastersState(DEFAULT_MASTERS);
    setEvaluationRecordsState({});
    setInputsState({});
    setHistoryState([]);
    setChangeLogsState([]);
    setSmarthrConfigState(DEFAULT_SMARTHR_CONFIG);
    setDepartmentMappingsState([]);
    setQualificationMappingsState([]);
    setSelectedPeriodIdState('');
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // セッター関数（Firestoreに保存）
  const setOffices = useCallback((value: Office[] | ((prev: Office[]) => Office[])) => {
    setOfficesState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      saveOffices(newValue).catch(console.error);
      return newValue;
    });
  }, []);

  const setStaffList = useCallback((value: Staff[] | ((prev: Staff[]) => Staff[])) => {
    setStaffListState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      saveStaffList(newValue).catch(console.error);
      return newValue;
    });
  }, []);

  const setMasters = useCallback((value: Record<BusinessType, MasterData> | ((prev: Record<BusinessType, MasterData>) => Record<BusinessType, MasterData>)) => {
    setMastersState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      saveMasters(newValue).catch(console.error);
      return newValue;
    });
  }, []);

  const setEvaluationRecords = useCallback((value: Record<string, EvaluationRecord> | ((prev: Record<string, EvaluationRecord>) => Record<string, EvaluationRecord>)) => {
    setEvaluationRecordsState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      saveEvaluationRecords(newValue).catch(console.error);
      return newValue;
    });
  }, []);

  const setInputs = useCallback((value: Record<string, StaffUpdateData> | ((prev: Record<string, StaffUpdateData>) => Record<string, StaffUpdateData>)) => {
    setInputsState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      saveInputs(newValue).catch(console.error);
      return newValue;
    });
  }, []);

  const setHistory = useCallback((value: HistoryEntry[] | ((prev: HistoryEntry[]) => HistoryEntry[])) => {
    setHistoryState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      saveHistory(newValue).catch(console.error);
      return newValue;
    });
  }, []);

  // 設定はまとめて保存
  const saveConfigData = useCallback(async (
    config: SmartHRConfig,
    deptMappings: DepartmentOfficeMapping[],
    qualMappings: QualificationMapping[],
    periodId: string
  ) => {
    await saveConfig({
      smarthrConfig: config,
      departmentMappings: deptMappings,
      qualificationMappings: qualMappings,
      selectedPeriodId: periodId
    });
  }, []);

  // refを最新の値で更新（ステート変更時に同期）
  useEffect(() => {
    smarthrConfigRef.current = smarthrConfig;
  }, [smarthrConfig]);
  useEffect(() => {
    departmentMappingsRef.current = departmentMappings;
  }, [departmentMappings]);
  useEffect(() => {
    qualificationMappingsRef.current = qualificationMappings;
  }, [qualificationMappings]);
  useEffect(() => {
    selectedPeriodIdRef.current = selectedPeriodId;
  }, [selectedPeriodId]);

  const setSmarthrConfig = useCallback((value: SmartHRConfig | ((prev: SmartHRConfig) => SmartHRConfig)) => {
    setSmarthrConfigState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      smarthrConfigRef.current = newValue;
      saveConfigData(newValue, departmentMappingsRef.current, qualificationMappingsRef.current, selectedPeriodIdRef.current).catch(console.error);
      return newValue;
    });
  }, [saveConfigData]);

  const setDepartmentMappings = useCallback((value: DepartmentOfficeMapping[] | ((prev: DepartmentOfficeMapping[]) => DepartmentOfficeMapping[])) => {
    setDepartmentMappingsState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      departmentMappingsRef.current = newValue;
      saveConfigData(smarthrConfigRef.current, newValue, qualificationMappingsRef.current, selectedPeriodIdRef.current).catch(console.error);
      return newValue;
    });
  }, [saveConfigData]);

  const setQualificationMappings = useCallback((value: QualificationMapping[] | ((prev: QualificationMapping[]) => QualificationMapping[])) => {
    setQualificationMappingsState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      qualificationMappingsRef.current = newValue;
      saveConfigData(smarthrConfigRef.current, departmentMappingsRef.current, newValue, selectedPeriodIdRef.current).catch(console.error);
      return newValue;
    });
  }, [saveConfigData]);

  const setSelectedPeriodId = useCallback((value: string) => {
    setSelectedPeriodIdState(value);
    selectedPeriodIdRef.current = value;
    saveConfigData(smarthrConfigRef.current, departmentMappingsRef.current, qualificationMappingsRef.current, value).catch(console.error);
  }, [smarthrConfig, departmentMappings, qualificationMappings, saveConfigData]);

  // 個別更新関数
  const handleInputChange = useCallback((data: StaffUpdateData) => {
    const key = `${data.periodId}_${data.staffId}`;
    setInputsState(prev => ({ ...prev, [key]: data }));
    updateInput(key, data).catch(console.error);
  }, []);

  const handleAddHistoryEntry = useCallback((entry: HistoryEntry) => {
    setHistoryState(prev => [entry, ...prev]);
    addHistoryEntry(entry).catch(console.error);
  }, []);

  const handleAddChangeLog = useCallback((entry: ChangeLogEntry) => {
    setChangeLogsState(prev => [entry, ...prev]);
    addChangeLog(entry).catch(console.error);
  }, []);

  return {
    offices,
    staffList,
    masters,
    evaluationRecords,
    inputs,
    history,
    changeLogs,
    smarthrConfig,
    departmentMappings,
    qualificationMappings,
    selectedPeriodId,
    loading,
    error,
    setOffices,
    setStaffList,
    setMasters,
    setEvaluationRecords,
    setInputs,
    setHistory,
    setSmarthrConfig,
    setDepartmentMappings,
    setQualificationMappings,
    setSelectedPeriodId,
    handleInputChange,
    handleAddHistoryEntry,
    handleAddChangeLog,
    reload: loadData
  };
}
