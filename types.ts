
export enum BusinessType {
  HOME_CARE = 'HOME_CARE', 
  HOME_NURSING = 'HOME_NURSING'
}

export interface Office {
  id: string;
  name: string;
  type: BusinessType;
}

export interface QualificationMaster {
  id: string;
  name: string;
  allowance: number;
  priority: number; 
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
