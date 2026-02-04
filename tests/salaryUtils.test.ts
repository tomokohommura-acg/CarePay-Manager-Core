import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getEffectiveBaseSalary,
  addBaseSalaryRevision,
  removeBaseSalaryRevision,
  updateBaseSalaryRevision,
  migrateStaffBaseSalary,
  sortHistoryByEffectiveMonth,
  formatMonth
} from '../utils/salaryUtils';
import { Staff, BaseSalaryRevision, BusinessType } from '../types';

// モックのcrypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
});

// テスト用のスタッフデータを作成するヘルパー
function createTestStaff(overrides: Partial<Staff> = {}): Staff {
  return {
    id: 'staff-001',
    officeId: 'office-001',
    name: 'テスト 太郎',
    baseSalary: 250000,
    qualifications: [],
    previousSalary: 240000,
    ...overrides
  };
}

// テスト用の改定履歴を作成するヘルパー
function createRevision(overrides: Partial<BaseSalaryRevision> = {}): BaseSalaryRevision {
  return {
    id: 'rev-001',
    effectiveMonth: '2024-04',
    amount: 250000,
    createdAt: '2024-04-01T09:00:00.000Z',
    ...overrides
  };
}

describe('salaryUtils', () => {
  describe('getEffectiveBaseSalary', () => {
    it('履歴がない場合は現在の基本給を返す', () => {
      const staff = createTestStaff({ baseSalary: 300000 });
      expect(getEffectiveBaseSalary(staff, '2024-10')).toBe(300000);
    });

    it('空の履歴配列の場合は現在の基本給を返す', () => {
      const staff = createTestStaff({ baseSalary: 300000, baseSalaryHistory: [] });
      expect(getEffectiveBaseSalary(staff, '2024-10')).toBe(300000);
    });

    it('評価期間に適用される最新の改定を返す', () => {
      const staff = createTestStaff({
        baseSalaryHistory: [
          createRevision({ effectiveMonth: '2020-04', amount: 220000, createdAt: '2020-04-01T09:00:00Z' }),
          createRevision({ effectiveMonth: '2022-04', amount: 235000, createdAt: '2022-04-01T09:00:00Z' }),
          createRevision({ effectiveMonth: '2024-04', amount: 250000, createdAt: '2024-04-01T09:00:00Z' }),
        ]
      });

      // 2024-10の評価期間では2024-04の改定が適用される
      expect(getEffectiveBaseSalary(staff, '2024-10')).toBe(250000);

      // 2023-10の評価期間では2022-04の改定が適用される
      expect(getEffectiveBaseSalary(staff, '2023-10')).toBe(235000);

      // 2021-04の評価期間では2020-04の改定が適用される
      expect(getEffectiveBaseSalary(staff, '2021-04')).toBe(220000);
    });

    it('同一月に複数の改定がある場合、createdAtが最新のものを返す', () => {
      const staff = createTestStaff({
        baseSalaryHistory: [
          createRevision({ id: 'rev-1', effectiveMonth: '2024-04', amount: 250000, createdAt: '2024-04-01T09:00:00Z' }),
          createRevision({ id: 'rev-2', effectiveMonth: '2024-04', amount: 260000, createdAt: '2024-04-15T09:00:00Z' }),
        ]
      });

      expect(getEffectiveBaseSalary(staff, '2024-10')).toBe(260000);
    });

    it('適用可能な改定がない場合は現在の基本給を返す', () => {
      const staff = createTestStaff({
        baseSalary: 200000,
        baseSalaryHistory: [
          createRevision({ effectiveMonth: '2025-04', amount: 300000 }),
        ]
      });

      // 2024-10の評価期間では2025-04の改定はまだ適用されない
      expect(getEffectiveBaseSalary(staff, '2024-10')).toBe(200000);
    });
  });

  describe('addBaseSalaryRevision', () => {
    it('新しい改定を追加する', () => {
      const staff = createTestStaff({ baseSalary: 250000, baseSalaryHistory: [] });
      const result = addBaseSalaryRevision(staff, {
        effectiveMonth: '2025-04',
        amount: 280000,
        memo: '定期昇給'
      });

      expect(result.baseSalaryHistory).toHaveLength(1);
      expect(result.baseSalaryHistory![0].amount).toBe(280000);
      expect(result.baseSalaryHistory![0].effectiveMonth).toBe('2025-04');
      expect(result.baseSalaryHistory![0].memo).toBe('定期昇給');
      expect(result.baseSalary).toBe(280000); // 最新の基本給も更新
    });

    it('既存の履歴に追加する', () => {
      const staff = createTestStaff({
        baseSalaryHistory: [
          createRevision({ effectiveMonth: '2024-04', amount: 250000 })
        ]
      });

      const result = addBaseSalaryRevision(staff, {
        effectiveMonth: '2025-04',
        amount: 280000
      });

      expect(result.baseSalaryHistory).toHaveLength(2);
    });
  });

  describe('removeBaseSalaryRevision', () => {
    it('指定した改定を削除する', () => {
      const staff = createTestStaff({
        baseSalaryHistory: [
          createRevision({ id: 'rev-1', effectiveMonth: '2020-04', amount: 220000, createdAt: '2020-04-01T09:00:00Z' }),
          createRevision({ id: 'rev-2', effectiveMonth: '2022-04', amount: 235000, createdAt: '2022-04-01T09:00:00Z' }),
          createRevision({ id: 'rev-3', effectiveMonth: '2024-04', amount: 250000, createdAt: '2024-04-01T09:00:00Z' }),
        ]
      });

      const result = removeBaseSalaryRevision(staff, 'rev-3');

      expect(result.baseSalaryHistory).toHaveLength(2);
      expect(result.baseSalaryHistory!.find(r => r.id === 'rev-3')).toBeUndefined();
      expect(result.baseSalary).toBe(235000); // 最新の基本給が更新される
    });

    it('存在しないIDを削除しようとしても何も起きない', () => {
      const staff = createTestStaff({
        baseSalaryHistory: [
          createRevision({ id: 'rev-1', amount: 250000 })
        ]
      });

      const result = removeBaseSalaryRevision(staff, 'non-existent');

      expect(result.baseSalaryHistory).toHaveLength(1);
    });
  });

  describe('updateBaseSalaryRevision', () => {
    it('指定した改定を更新する', () => {
      const staff = createTestStaff({
        baseSalaryHistory: [
          createRevision({ id: 'rev-1', effectiveMonth: '2024-04', amount: 250000, createdAt: '2024-04-01T09:00:00Z' })
        ]
      });

      const result = updateBaseSalaryRevision(staff, 'rev-1', {
        amount: 280000,
        memo: '金額訂正'
      });

      expect(result.baseSalaryHistory![0].amount).toBe(280000);
      expect(result.baseSalaryHistory![0].memo).toBe('金額訂正');
      expect(result.baseSalary).toBe(280000);
    });
  });

  describe('migrateStaffBaseSalary', () => {
    it('履歴がない場合、初期履歴を作成する', () => {
      const staff = createTestStaff({
        baseSalary: 250000,
        enteredAt: '2020-04-01'
      });

      const result = migrateStaffBaseSalary(staff);

      expect(result.baseSalaryHistory).toHaveLength(1);
      expect(result.baseSalaryHistory![0].effectiveMonth).toBe('2020-04');
      expect(result.baseSalaryHistory![0].amount).toBe(250000);
      expect(result.baseSalaryHistory![0].memo).toBe('初期移行データ');
    });

    it('既に履歴がある場合は何もしない', () => {
      const existingHistory = [createRevision()];
      const staff = createTestStaff({
        baseSalaryHistory: existingHistory
      });

      const result = migrateStaffBaseSalary(staff);

      expect(result.baseSalaryHistory).toBe(existingHistory);
    });

    it('enteredAtがない場合はデフォルト値を使用', () => {
      const staff = createTestStaff({
        baseSalary: 250000,
        enteredAt: undefined
      });

      const result = migrateStaffBaseSalary(staff);

      expect(result.baseSalaryHistory![0].effectiveMonth).toBe('2000-01');
    });
  });

  describe('sortHistoryByEffectiveMonth', () => {
    it('適用月順（古い順）にソートする', () => {
      const history = [
        createRevision({ id: 'rev-3', effectiveMonth: '2024-04', createdAt: '2024-04-01T09:00:00Z' }),
        createRevision({ id: 'rev-1', effectiveMonth: '2020-04', createdAt: '2020-04-01T09:00:00Z' }),
        createRevision({ id: 'rev-2', effectiveMonth: '2022-04', createdAt: '2022-04-01T09:00:00Z' }),
      ];

      const sorted = sortHistoryByEffectiveMonth(history);

      expect(sorted[0].id).toBe('rev-1');
      expect(sorted[1].id).toBe('rev-2');
      expect(sorted[2].id).toBe('rev-3');
    });

    it('同一月はcreatedAt順（古い順）にソートする', () => {
      const history = [
        createRevision({ id: 'rev-2', effectiveMonth: '2024-04', createdAt: '2024-04-15T09:00:00Z' }),
        createRevision({ id: 'rev-1', effectiveMonth: '2024-04', createdAt: '2024-04-01T09:00:00Z' }),
      ];

      const sorted = sortHistoryByEffectiveMonth(history);

      expect(sorted[0].id).toBe('rev-1');
      expect(sorted[1].id).toBe('rev-2');
    });
  });

  describe('formatMonth', () => {
    it('YYYY-MM形式をYYYY年MM月形式に変換する', () => {
      expect(formatMonth('2024-04')).toBe('2024年04月');
      expect(formatMonth('2023-12')).toBe('2023年12月');
      expect(formatMonth('2025-01')).toBe('2025年01月');
    });
  });
});
