
export enum BusinessType {
  HOME_CARE = 'HOME_CARE', 
  HOME_NURSING = 'HOME_NURSING'
}

export interface Office {
  id: string;
  name: string;
  type: BusinessType;
  smarthrDepartmentId?: string;
}

export interface QualificationMaster {
  id: string;
  name: string;
  allowance: number;
  priority: number;
  smarthrCode?: string;  // SmartHR連携用コード（英語コード等）
}

export interface AttendanceConditionMaster {
  id: string;
  name: string;
  unitAmount: number;
  unitLabel: string;
}

export interface PerformanceEvaluationMaster {
  id: string;
  name: string;
  unitAmount: number;
  unitLabel: string;
}

export interface EvaluationPeriodMaster {
  id: string;
  name: string;
  evaluationStart: string;
  evaluationEnd: string;
  paymentStart: string;
  paymentEnd: string;
  status: 'editing' | 'locked'; // 追加: 期間のステータス
}

export interface MasterData {
  qualifications: QualificationMaster[];
  attendanceConditions: AttendanceConditionMaster[];
  performanceEvaluations: PerformanceEvaluationMaster[];
  periods: EvaluationPeriodMaster[]; 
}

export interface Staff {
  id: string;
  officeId: string;
  name: string;
  baseSalary: number;
  qualifications: string[];
  previousSalary?: number;
  // 入社日・退職日
  enteredAt?: string;
  resignedAt?: string;
  // SmartHR連携用
  smarthrEmpCode?: string;
  smarthrCrewId?: string;
  smarthrSyncedAt?: string;
}

export interface EvaluationRecord {
  staffId: string;
  officeId: string;
  name: string;
  baseSalary: number;
  qualifications: string[];
  previousSalary?: number;
}

export interface StaffUpdateData {
  staffId: string;
  periodId: string; 
  attendanceInputs: Record<string, number>; 
  performanceInputs: Record<string, number>; 
  isLocked?: boolean; 
}

export interface HistoryEntry {
  id: string;
  officeId: string;
  officeName: string;
  timestamp: string;
  period: EvaluationPeriodMaster;
  masterSnapshot: MasterData;
  recordsSnapshot: Record<string, EvaluationRecord>;
  inputs: Record<string, StaffUpdateData>;
}

// SmartHR連携設定
export interface SmartHRConfig {
  subdomain: string;
  accessToken: string;
  employmentTypeFilter: string[]; // 正社員のIDリスト
  lastSyncedAt: string | null;
  storeToken: boolean; // トークンを保存するかどうか
}

// 部署→事業所マッピング
export interface DepartmentOfficeMapping {
  smarthrDepartmentId: string;
  smarthrDepartmentName: string;
  smarthrDepartmentFullPath?: string;  // フルパス名（同期時の照合用）
  officeId: string;
}

// 資格マッピング
export interface QualificationMapping {
  id: string;
  smarthrFieldId: string;
  smarthrFieldName: string;
  smarthrValueId: string | null;
  smarthrValueName: string | null;
  qualificationId: string;
  businessType: BusinessType;
}

// SmartHR同期結果
export interface SmartHRSyncPreview {
  toAdd: SmartHRSyncItem[];
  toUpdate: SmartHRSyncItem[];
  statusChanges: SmartHRStatusChangeItem[];  // 退職・雇用形態変更
  skipped: SmartHRSkippedItem[];
}

export interface SmartHRSyncItem {
  smarthrCrewId: string;
  empCode: string;
  name: string;
  department: string | null;
  officeId: string;
  officeName: string;
  qualifications: string[];
  enteredAt?: string;
  resignedAt?: string;
  existingStaffId?: string;
}

export interface SmartHRStatusChangeItem {
  staffId: string;
  smarthrCrewId: string;
  empCode: string;
  name: string;
  changeType: 'resigned' | 'employment_type_changed';
  changeDetail: string;
  resignedAt?: string;
}

export interface SmartHRSkippedItem {
  smarthrCrewId: string;
  empCode: string;
  name: string;
  reason: string;
}
