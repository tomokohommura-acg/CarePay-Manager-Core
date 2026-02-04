import { BusinessType, Office, Staff, MasterData, EvaluationRecord, StaffUpdateData, HistoryEntry, AppUser } from '../types';

// デモ用ダミーユーザー
export const demoUser: AppUser = {
  uid: 'demo-user-001',
  email: 'demo@example.com',
  displayName: 'デモユーザー',
  role: 'admin',
  createdAt: new Date().toISOString()
};

// デモ用事業所
export const demoOffices: Office[] = [
  {
    id: 'office-001',
    name: '訪問介護（デモ事業所A）',
    type: BusinessType.HOME_CARE
  },
  {
    id: 'office-002',
    name: '訪問看護（デモ事業所B）',
    type: BusinessType.HOME_NURSING
  }
];

// デモ用職員
export const demoStaffList: Staff[] = [
  {
    id: 'staff-001',
    officeId: 'office-001',
    name: '山田 太郎',
    baseSalary: 250000,
    qualifications: ['qual-001'],
    previousSalary: 245000,
    smarthrEmpCode: 'EMP001',
    enteredAt: '2020-04-01',
    baseSalaryHistory: [
      { id: 'rev-001', effectiveMonth: '2020-04', amount: 220000, memo: '入社時', createdAt: '2020-04-01T00:00:00Z' },
      { id: 'rev-002', effectiveMonth: '2022-04', amount: 235000, memo: '昇給', createdAt: '2022-04-01T00:00:00Z' },
      { id: 'rev-003', effectiveMonth: '2024-04', amount: 250000, memo: '昇給', createdAt: '2024-04-01T00:00:00Z' }
    ]
  },
  {
    id: 'staff-002',
    officeId: 'office-001',
    name: '佐藤 花子',
    baseSalary: 230000,
    qualifications: ['qual-002'],
    previousSalary: 230000,
    smarthrEmpCode: 'EMP002',
    enteredAt: '2021-10-01',
    baseSalaryHistory: [
      { id: 'rev-004', effectiveMonth: '2021-10', amount: 210000, memo: '入社時', createdAt: '2021-10-01T00:00:00Z' },
      { id: 'rev-005', effectiveMonth: '2023-04', amount: 230000, memo: '昇給', createdAt: '2023-04-01T00:00:00Z' }
    ]
  },
  {
    id: 'staff-003',
    officeId: 'office-001',
    name: '鈴木 一郎',
    baseSalary: 280000,
    qualifications: ['qual-001', 'qual-002'],
    previousSalary: 275000,
    smarthrEmpCode: 'EMP003',
    enteredAt: '2018-04-01',
    baseSalaryHistory: [
      { id: 'rev-006', effectiveMonth: '2018-04', amount: 230000, memo: '入社時', createdAt: '2018-04-01T00:00:00Z' },
      { id: 'rev-007', effectiveMonth: '2020-04', amount: 250000, memo: '昇給', createdAt: '2020-04-01T00:00:00Z' },
      { id: 'rev-008', effectiveMonth: '2022-04', amount: 265000, memo: '昇給', createdAt: '2022-04-01T00:00:00Z' },
      { id: 'rev-009', effectiveMonth: '2024-04', amount: 280000, memo: '昇給', createdAt: '2024-04-01T00:00:00Z' }
    ]
  },
  {
    id: 'staff-004',
    officeId: 'office-001',
    name: '田中 美咲',
    baseSalary: 220000,
    qualifications: [],
    previousSalary: 215000,
    smarthrEmpCode: 'EMP004',
    enteredAt: '2023-04-01',
    baseSalaryHistory: [
      { id: 'rev-010', effectiveMonth: '2023-04', amount: 200000, memo: '入社時', createdAt: '2023-04-01T00:00:00Z' },
      { id: 'rev-011', effectiveMonth: '2024-10', amount: 220000, memo: '昇給', createdAt: '2024-10-01T00:00:00Z' }
    ]
  },
  {
    id: 'staff-005',
    officeId: 'office-002',
    name: '高橋 看護師',
    baseSalary: 320000,
    qualifications: ['qual-n-001'],
    previousSalary: 315000,
    smarthrEmpCode: 'EMP005',
    enteredAt: '2019-04-01',
    baseSalaryHistory: [
      { id: 'rev-012', effectiveMonth: '2019-04', amount: 280000, memo: '入社時', createdAt: '2019-04-01T00:00:00Z' },
      { id: 'rev-013', effectiveMonth: '2021-04', amount: 300000, memo: '昇給', createdAt: '2021-04-01T00:00:00Z' },
      { id: 'rev-014', effectiveMonth: '2023-04', amount: 320000, memo: '昇給', createdAt: '2023-04-01T00:00:00Z' }
    ]
  }
];

// デモ用マスタデータ
export const demoMasters: Record<BusinessType, MasterData> = {
  [BusinessType.HOME_CARE]: {
    qualifications: [
      { id: 'qual-001', name: '介護福祉士', allowance: 15000, priority: 1 },
      { id: 'qual-002', name: '初任者研修', allowance: 5000, priority: 2 },
      { id: 'qual-003', name: '実務者研修', allowance: 10000, priority: 3 }
    ],
    attendanceConditions: [
      { id: 'att-001', name: '欠勤', unitAmount: 10000 },
      { id: 'att-002', name: '遅刻', unitAmount: 3000 },
      { id: 'att-003', name: '早退', unitAmount: 3000 }
    ],
    performanceEvaluations: [
      { id: 'perf-001', name: '訪問件数加算', unitAmount: 500 },
      { id: 'perf-002', name: '緊急対応', unitAmount: 2000 },
      { id: 'perf-003', name: '研修参加', unitAmount: 1000 }
    ],
    periods: [
      {
        id: 'period-001',
        name: '2024年度上期',
        evaluationStart: '2024-04',
        evaluationEnd: '2024-09',
        paymentStart: '2024-10',
        paymentEnd: '2025-03',
        status: 'locked'
      },
      {
        id: 'period-002',
        name: '2024年度下期',
        evaluationStart: '2024-10',
        evaluationEnd: '2025-03',
        paymentStart: '2025-04',
        paymentEnd: '2025-09',
        status: 'editing'
      }
    ]
  },
  [BusinessType.HOME_NURSING]: {
    qualifications: [
      { id: 'qual-n-001', name: '看護師', allowance: 30000, priority: 1 },
      { id: 'qual-n-002', name: '准看護師', allowance: 20000, priority: 2 }
    ],
    attendanceConditions: [
      { id: 'att-n-001', name: '欠勤', unitAmount: 15000 },
      { id: 'att-n-002', name: '遅刻', unitAmount: 5000 }
    ],
    performanceEvaluations: [
      { id: 'perf-n-001', name: '訪問件数加算', unitAmount: 800 },
      { id: 'perf-n-002', name: '夜間対応', unitAmount: 3000 }
    ],
    periods: [
      {
        id: 'period-n-001',
        name: '2024年度上期',
        evaluationStart: '2024-04',
        evaluationEnd: '2024-09',
        paymentStart: '2024-10',
        paymentEnd: '2025-03',
        status: 'locked'
      },
      {
        id: 'period-n-002',
        name: '2024年度下期',
        evaluationStart: '2024-10',
        evaluationEnd: '2025-03',
        paymentStart: '2025-04',
        paymentEnd: '2025-09',
        status: 'editing'
      }
    ]
  }
};

// デモ用評価レコード
export const demoEvaluationRecords: Record<string, EvaluationRecord> = {
  'period-001_staff-001': {
    staffId: 'staff-001',
    officeId: 'office-001',
    name: '山田 太郎',
    baseSalary: 250000,
    qualifications: ['qual-001'],
    previousSalary: 245000
  },
  'period-001_staff-002': {
    staffId: 'staff-002',
    officeId: 'office-001',
    name: '佐藤 花子',
    baseSalary: 230000,
    qualifications: ['qual-002'],
    previousSalary: 230000
  },
  'period-001_staff-003': {
    staffId: 'staff-003',
    officeId: 'office-001',
    name: '鈴木 一郎',
    baseSalary: 280000,
    qualifications: ['qual-001', 'qual-002'],
    previousSalary: 275000
  },
  'period-001_staff-004': {
    staffId: 'staff-004',
    officeId: 'office-001',
    name: '田中 美咲',
    baseSalary: 220000,
    qualifications: [],
    previousSalary: 215000
  },
  'period-002_staff-001': {
    staffId: 'staff-001',
    officeId: 'office-001',
    name: '山田 太郎',
    baseSalary: 250000,
    qualifications: ['qual-001'],
    previousSalary: 263500
  },
  'period-002_staff-002': {
    staffId: 'staff-002',
    officeId: 'office-001',
    name: '佐藤 花子',
    baseSalary: 230000,
    qualifications: ['qual-002'],
    previousSalary: 232000
  },
  'period-002_staff-003': {
    staffId: 'staff-003',
    officeId: 'office-001',
    name: '鈴木 一郎',
    baseSalary: 280000,
    qualifications: ['qual-001', 'qual-002'],
    previousSalary: 298000
  },
  'period-002_staff-004': {
    staffId: 'staff-004',
    officeId: 'office-001',
    name: '田中 美咲',
    baseSalary: 220000,
    qualifications: [],
    previousSalary: 218500
  },
  'period-n-001_staff-005': {
    staffId: 'staff-005',
    officeId: 'office-002',
    name: '高橋 看護師',
    baseSalary: 320000,
    qualifications: ['qual-n-001'],
    previousSalary: 315000
  },
  'period-n-002_staff-005': {
    staffId: 'staff-005',
    officeId: 'office-002',
    name: '高橋 看護師',
    baseSalary: 320000,
    qualifications: ['qual-n-001'],
    previousSalary: 352400
  }
};

// デモ用入力データ
export const demoInputs: Record<string, StaffUpdateData> = {
  'period-001_staff-001': {
    staffId: 'staff-001',
    periodId: 'period-001',
    attendanceInputs: { 'att-001': 0, 'att-002': 1, 'att-003': 0 },
    performanceInputs: { 'perf-001': 5, 'perf-002': 1, 'perf-003': 2 }
  },
  'period-001_staff-002': {
    staffId: 'staff-002',
    periodId: 'period-001',
    attendanceInputs: { 'att-001': 0, 'att-002': 0, 'att-003': 0 },
    performanceInputs: { 'perf-001': 3, 'perf-002': 0, 'perf-003': 1 }
  },
  'period-001_staff-003': {
    staffId: 'staff-003',
    periodId: 'period-001',
    attendanceInputs: { 'att-001': 0, 'att-002': 0, 'att-003': 0 },
    performanceInputs: { 'perf-001': 8, 'perf-002': 2, 'perf-003': 3 }
  },
  'period-001_staff-004': {
    staffId: 'staff-004',
    periodId: 'period-001',
    attendanceInputs: { 'att-001': 1, 'att-002': 2, 'att-003': 0 },
    performanceInputs: { 'perf-001': 2, 'perf-002': 0, 'perf-003': 1 }
  },
  'period-002_staff-001': {
    staffId: 'staff-001',
    periodId: 'period-002',
    attendanceInputs: { 'att-001': 0, 'att-002': 0, 'att-003': 0 },
    performanceInputs: { 'perf-001': 6, 'perf-002': 2, 'perf-003': 1 }
  },
  'period-002_staff-002': {
    staffId: 'staff-002',
    periodId: 'period-002',
    attendanceInputs: { 'att-001': 0, 'att-002': 1, 'att-003': 0 },
    performanceInputs: { 'perf-001': 4, 'perf-002': 1, 'perf-003': 2 }
  },
  'period-n-001_staff-005': {
    staffId: 'staff-005',
    periodId: 'period-n-001',
    attendanceInputs: { 'att-n-001': 0, 'att-n-002': 0 },
    performanceInputs: { 'perf-n-001': 10, 'perf-n-002': 3 }
  },
  'period-n-002_staff-005': {
    staffId: 'staff-005',
    periodId: 'period-n-002',
    attendanceInputs: { 'att-n-001': 0, 'att-n-002': 1 },
    performanceInputs: { 'perf-n-001': 12, 'perf-n-002': 4 }
  }
};

// デモ用履歴データ
export const demoHistory: HistoryEntry[] = [
  {
    id: 'history-001',
    officeId: 'office-001',
    officeName: '訪問介護（デモ事業所A）',
    timestamp: '2024/10/01 10:00:00',
    period: demoMasters[BusinessType.HOME_CARE].periods[0],
    masterSnapshot: demoMasters[BusinessType.HOME_CARE],
    recordsSnapshot: {
      'period-001_staff-001': demoEvaluationRecords['period-001_staff-001'],
      'period-001_staff-002': demoEvaluationRecords['period-001_staff-002'],
      'period-001_staff-003': demoEvaluationRecords['period-001_staff-003'],
      'period-001_staff-004': demoEvaluationRecords['period-001_staff-004']
    },
    inputs: {
      'period-001_staff-001': demoInputs['period-001_staff-001'],
      'period-001_staff-002': demoInputs['period-001_staff-002'],
      'period-001_staff-003': demoInputs['period-001_staff-003'],
      'period-001_staff-004': demoInputs['period-001_staff-004']
    }
  },
  {
    id: 'history-002',
    officeId: 'office-002',
    officeName: '訪問看護（デモ事業所B）',
    timestamp: '2024/10/01 11:00:00',
    period: demoMasters[BusinessType.HOME_NURSING].periods[0],
    masterSnapshot: demoMasters[BusinessType.HOME_NURSING],
    recordsSnapshot: {
      'period-n-001_staff-005': demoEvaluationRecords['period-n-001_staff-005']
    },
    inputs: {
      'period-n-001_staff-005': demoInputs['period-n-001_staff-005']
    }
  }
];
