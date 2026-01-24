
import { BusinessType, MasterData, Office, Staff } from './types';

export const DEFAULT_MASTERS: Record<BusinessType, MasterData> = {
  [BusinessType.HOME_CARE]: {
    qualifications: [
      { id: 'hc_q1', name: '介護福祉士', allowance: 10000, priority: 1 },
      { id: 'hc_q2', name: '実務者研修', allowance: 5000, priority: 2 },
      { id: 'hc_q3', name: '初任者研修', allowance: 2000, priority: 3 },
    ],
    attendanceConditions: [
      { id: 'ac1', name: '時間制限', unitAmount: 3000, unitLabel: '時間' },
      { id: 'ac2', name: '固定休み', unitAmount: 2000, unitLabel: '日' },
      { id: 'ac3', name: '半日休み', unitAmount: 1000, unitLabel: '回' },
    ],
    performanceEvaluations: [
      { id: 'pe1', name: '早朝夜間対応', unitAmount: 500, unitLabel: '回' },
      { id: 'pe2', name: '緊急訪問', unitAmount: 1000, unitLabel: '回' },
      { id: 'pe3', name: 'ヒヤリハット報告', unitAmount: 200, unitLabel: '件' },
      { id: 'pe4', name: 'クレーム発生', unitAmount: -2000, unitLabel: '件' },
    ],
    periods: [
      { id: 'p1', name: '2024年度 上期評価', evaluationStart: '2024-04', evaluationEnd: '2024-09', paymentStart: '2024-10', paymentEnd: '2025-03', status: 'locked' },
      { id: 'p2', name: '2024年度 下期評価', evaluationStart: '2024-10', evaluationEnd: '2025-03', paymentStart: '2025-04', paymentEnd: '2025-09', status: 'editing' },
    ]
  },
  [BusinessType.HOME_NURSING]: {
    qualifications: [
      { id: 'hn_q1', name: '正看護師', allowance: 30000, priority: 1 },
      { id: 'hn_q2', name: '准看護師', allowance: 15000, priority: 2 },
    ],
    attendanceConditions: [
      { id: 'ac1', name: '時間制限', unitAmount: 5000, unitLabel: '時間' },
      { id: 'ac2', name: 'オンコール免除', unitAmount: 3000, unitLabel: '回' },
    ],
    performanceEvaluations: [
      { id: 'pe1', name: '看取り対応', unitAmount: 5000, unitLabel: '件' },
      { id: 'pe2', name: '困難事例担当', unitAmount: 3000, unitLabel: '件' },
    ],
    periods: [
      { id: 'p1', name: '2024年度 通期評価', evaluationStart: '2024-01', evaluationEnd: '2024-12', paymentStart: '2025-01', paymentEnd: '2025-12', status: 'editing' },
    ]
  }
};

export const INITIAL_OFFICES: Office[] = [
  { id: 'off1', name: 'ひまわり訪問介護 A事業所', type: BusinessType.HOME_CARE },
  { id: 'off2', name: 'ひまわり訪問介護 B事業所', type: BusinessType.HOME_CARE },
  { id: 'off3', name: 'あおぞら訪問看護ステーション', type: BusinessType.HOME_NURSING },
];

export const INITIAL_STAFF: Staff[] = [
  { id: 's1', officeId: 'off1', name: '佐藤 健二', baseSalary: 200000, qualifications: ['hc_q1'] },
  { id: 's2', officeId: 'off1', name: '田中 美咲', baseSalary: 180000, qualifications: ['hc_q2'] },
  { id: 's3', officeId: 'off2', name: '鈴木 一郎', baseSalary: 190000, qualifications: ['hc_q3'] },
  { id: 's4', officeId: 'off3', name: '高橋 花子', baseSalary: 250000, qualifications: ['hn_q1'] },
];
