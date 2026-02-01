import { useState, useEffect, useCallback } from 'react';
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
      setSmarthrConfigState(data.config.smarthrConfig || DEFAULT_SMARTHR_CONFIG);
      setDepartmentMappingsState(data.config.departmentMappings || []);
      setQualificationMappingsState(data.config.qualificationMappings || []);
      setSelectedPeriodIdState(data.config.selectedPeriodId || '');
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

  const setSmarthrConfig = useCallback((value: SmartHRConfig | ((prev: SmartHRConfig) => SmartHRConfig)) => {
    setSmarthrConfigState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      saveConfigData(newValue, departmentMappings, qualificationMappings, selectedPeriodId).catch(console.error);
      return newValue;
    });
  }, [departmentMappings, qualificationMappings, selectedPeriodId, saveConfigData]);

  const setDepartmentMappings = useCallback((value: DepartmentOfficeMapping[] | ((prev: DepartmentOfficeMapping[]) => DepartmentOfficeMapping[])) => {
    setDepartmentMappingsState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      saveConfigData(smarthrConfig, newValue, qualificationMappings, selectedPeriodId).catch(console.error);
      return newValue;
    });
  }, [smarthrConfig, qualificationMappings, selectedPeriodId, saveConfigData]);

  const setQualificationMappings = useCallback((value: QualificationMapping[] | ((prev: QualificationMapping[]) => QualificationMapping[])) => {
    setQualificationMappingsState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      saveConfigData(smarthrConfig, departmentMappings, newValue, selectedPeriodId).catch(console.error);
      return newValue;
    });
  }, [smarthrConfig, departmentMappings, selectedPeriodId, saveConfigData]);

  const setSelectedPeriodId = useCallback((value: string) => {
    setSelectedPeriodIdState(value);
    saveConfigData(smarthrConfig, departmentMappings, qualificationMappings, value).catch(console.error);
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
