/**
 * テストユーティリティ
 * React Testing Library のラッパーとヘルパー関数
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BusinessType, Staff, MasterData, Office, AppUser } from '../../types';

// テスト用のデフォルトマスタデータ
export const createTestMasterData = (overrides: Partial<MasterData> = {}): MasterData => ({
  qualifications: [
    { id: 'qual-001', name: '介護福祉士', allowance: 15000, priority: 1 },
    { id: 'qual-002', name: '初任者研修', allowance: 5000, priority: 2 }
  ],
  attendanceConditions: [
    { id: 'att-001', name: '欠勤', unitAmount: 10000 },
    { id: 'att-002', name: '遅刻', unitAmount: 3000 }
  ],
  performanceEvaluations: [
    { id: 'perf-001', name: '訪問件数加算', unitAmount: 500 },
    { id: 'perf-002', name: '緊急対応', unitAmount: 2000 }
  ],
  periods: [
    {
      id: 'period-001',
      name: '2024年度上期',
      evaluationStart: '2024-04',
      evaluationEnd: '2024-09',
      paymentStart: '2024-10',
      paymentEnd: '2025-03',
      status: 'editing'
    }
  ],
  ...overrides
});

// テスト用の職員データ
export const createTestStaff = (overrides: Partial<Staff> = {}): Staff => ({
  id: 'staff-001',
  officeId: 'office-001',
  name: 'テスト 太郎',
  baseSalary: 250000,
  qualifications: ['qual-001'],
  previousSalary: 245000,
  enteredAt: '2020-04-01',
  baseSalaryHistory: [
    { id: 'rev-001', effectiveMonth: '2020-04', amount: 220000, memo: '入社時', createdAt: '2020-04-01T00:00:00Z' },
    { id: 'rev-002', effectiveMonth: '2024-04', amount: 250000, memo: '昇給', createdAt: '2024-04-01T00:00:00Z' }
  ],
  ...overrides
});

// テスト用の事業所データ
export const createTestOffice = (overrides: Partial<Office> = {}): Office => ({
  id: 'office-001',
  name: 'テスト事業所',
  type: BusinessType.HOME_CARE,
  ...overrides
});

// テスト用のユーザーデータ
export const createTestUser = (overrides: Partial<AppUser> = {}): AppUser => ({
  uid: 'user-001',
  email: 'test@example.com',
  displayName: 'テストユーザー',
  role: 'admin',
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides
});

// カスタムレンダラー（将来的にProviderをラップする用）
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // 必要に応じてコンテキスト値を追加
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  return render(ui, { ...options });
};

// re-export everything
export * from '@testing-library/react';
export { customRender as render };

// ユーティリティ関数
export const waitForLoadingToFinish = () =>
  new Promise(resolve => setTimeout(resolve, 0));

// 金額フォーマット確認
export const expectFormattedCurrency = (value: number) =>
  `¥${value.toLocaleString()}`;

// 日付フォーマット確認
export const formatDateForTest = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP');
};
