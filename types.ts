
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
  baseSalary: number;                      // 最新の基本給（後方互換用）
  baseSalaryHistory?: BaseSalaryRevision[]; // 改定履歴配列
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

// ============================================
// GWS認証 + 権限管理
// ============================================

export type UserRole = 'admin' | 'user';

export type OfficePermissionLevel = 'edit' | 'view';

export interface OfficePermission {
  officeId: string;
  permission: OfficePermissionLevel;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  // 旧形式（後方互換）
  allowedOfficeIds?: string[];
  // 新形式: 事業所ごとの権限設定（管理者は常に全権限）
  officePermissions?: OfficePermission[];
  createdAt: string;
}

// ============================================
// 基本給改定履歴管理
// ============================================

export interface BaseSalaryRevision {
  id: string;              // UUID
  effectiveMonth: string;  // "YYYY-MM" 形式（例："2024-04"）
  amount: number;          // 基本給額
  memo?: string;           // 変更理由メモ（任意）
  createdAt: string;       // 作成日時
}

// ============================================
// 評価履歴の変更ログ
// ============================================

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  userId: string;           // 変更したユーザー
  userName: string;
  periodId: string;
  periodName: string;
  changes: ChangeDetail[];
}

export interface ChangeDetail {
  staffId: string;
  staffName: string;
  field: string;            // "baseSalary" | "attendance_xxx" | "performance_xxx"
  fieldName: string;        // "基本給" | "欠勤" など
  oldValue: number | string;
  newValue: number | string;
}
