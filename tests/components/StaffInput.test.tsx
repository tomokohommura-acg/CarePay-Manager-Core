/**
 * StaffInput コンポーネントのテスト
 * 給与計算ロジックとUIのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StaffInput } from '../../components/StaffInput';
import { EvaluationRecord, MasterData, StaffUpdateData } from '../../types';

// テスト用マスタデータ
const createTestMasterData = (overrides: Partial<MasterData> = {}): MasterData => ({
  qualifications: [
    { id: 'qual-001', name: '介護福祉士', allowance: 15000, priority: 1 },
    { id: 'qual-002', name: '初任者研修', allowance: 5000, priority: 2 },
    { id: 'qual-003', name: '実務者研修', allowance: 10000, priority: 3 }
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
    },
    {
      id: 'period-002',
      name: '2024年度下期',
      evaluationStart: '2024-10',
      evaluationEnd: '2025-03',
      paymentStart: '2025-04',
      paymentEnd: '2025-09',
      status: 'locked'
    }
  ],
  ...overrides
});

// テスト用評価レコード
const createTestRecord = (overrides: Partial<EvaluationRecord> = {}): EvaluationRecord => ({
  staffId: 'staff-001',
  officeId: 'office-001',
  name: '山田 太郎',
  baseSalary: 250000,
  qualifications: ['qual-001'],
  previousSalary: 260000,
  ...overrides
});

describe('StaffInput', () => {
  const defaultProps = {
    records: [createTestRecord()],
    master: createTestMasterData(),
    inputs: {} as Record<string, StaffUpdateData>,
    selectedPeriodId: 'period-001',
    onPeriodChange: vi.fn(),
    onInputChange: vi.fn(),
    onSaveHistory: vi.fn(),
    onOpenDashboard: vi.fn(),
    canEdit: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期表示', () => {
    it('評価期間選択が表示される', () => {
      render(<StaffInput {...defaultProps} />);
      expect(screen.getByText('評価期間の選択')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('評価期間の選択肢が正しく表示される', () => {
      render(<StaffInput {...defaultProps} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('period-001');

      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(2);
      expect(options[0].textContent).toBe('2024年度上期');
      expect(options[1].textContent).toContain('2024年度下期');
    });

    it('職員名が表示される', () => {
      render(<StaffInput {...defaultProps} />);
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    it('テーブルヘッダーが正しく表示される', () => {
      render(<StaffInput {...defaultProps} />);
      expect(screen.getByText('基本給')).toBeInTheDocument();
      expect(screen.getByText('資格手当')).toBeInTheDocument();
      expect(screen.getByText('正規給与')).toBeInTheDocument();
      expect(screen.getByText('減額合計')).toBeInTheDocument();
      expect(screen.getByText('評価合計')).toBeInTheDocument();
      expect(screen.getByText('最終支給額（新給与）')).toBeInTheDocument();
      expect(screen.getByText('旧給与')).toBeInTheDocument();
      expect(screen.getByText('差分')).toBeInTheDocument();
    });

    it('勤怠条件のカラムが表示される', () => {
      render(<StaffInput {...defaultProps} />);
      expect(screen.getByText('欠勤')).toBeInTheDocument();
      expect(screen.getByText('遅刻')).toBeInTheDocument();
    });

    it('業績評価のカラムが表示される', () => {
      render(<StaffInput {...defaultProps} />);
      expect(screen.getByText('訪問件数加算')).toBeInTheDocument();
      expect(screen.getByText('緊急対応')).toBeInTheDocument();
    });
  });

  describe('給与計算ロジック', () => {
    it('基本給が正しく表示される', () => {
      render(<StaffInput {...defaultProps} />);
      expect(screen.getByText('¥250,000')).toBeInTheDocument();
    });

    it('資格手当（最優先1つ）が正しく計算される', () => {
      render(<StaffInput {...defaultProps} />);
      // 介護福祉士（priority: 1）の15000円が適用される
      expect(screen.getByText('¥15,000')).toBeInTheDocument();
    });

    it('正規給与（基本給 + 資格手当）が正しく計算される', () => {
      render(<StaffInput {...defaultProps} />);
      // 250000 + 15000 = 265000（正規給与と最終支給額の両方に表示される可能性あり）
      const cells = screen.getAllByText('¥265,000');
      expect(cells.length).toBeGreaterThanOrEqual(1);
    });

    it('複数資格がある場合、最優先の資格手当が適用される', () => {
      const props = {
        ...defaultProps,
        records: [createTestRecord({ qualifications: ['qual-002', 'qual-001'] })] // 初任者研修と介護福祉士
      };
      render(<StaffInput {...props} />);
      // 介護福祉士（priority: 1）の15000円が適用される
      expect(screen.getByText('¥15,000')).toBeInTheDocument();
    });

    it('資格がない場合、資格手当は0円', () => {
      const props = {
        ...defaultProps,
        records: [createTestRecord({ qualifications: [] })]
      };
      render(<StaffInput {...props} />);
      // 資格手当0円、正規給与は基本給のみ
      const cells = screen.getAllByText('¥0');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('勤怠控除が正しく計算される', () => {
      const props = {
        ...defaultProps,
        inputs: {
          'period-001_staff-001': {
            staffId: 'staff-001',
            periodId: 'period-001',
            attendanceInputs: { 'att-001': 2, 'att-002': 1 }, // 欠勤2回、遅刻1回
            performanceInputs: {},
            isLocked: false
          }
        }
      };
      render(<StaffInput {...props} />);
      // 欠勤2回 × 10000 + 遅刻1回 × 3000 = 23000
      // 減額合計セルを確認
      const deductionCell = screen.getByText((content) => content.includes('-¥23,000'));
      expect(deductionCell).toBeInTheDocument();
    });

    it('業績評価が正しく計算される', () => {
      const props = {
        ...defaultProps,
        inputs: {
          'period-001_staff-001': {
            staffId: 'staff-001',
            periodId: 'period-001',
            attendanceInputs: {},
            performanceInputs: { 'perf-001': 10, 'perf-002': 3 }, // 訪問件数10件、緊急対応3回
            isLocked: false
          }
        }
      };
      render(<StaffInput {...props} />);
      // 訪問件数10 × 500 + 緊急対応3 × 2000 = 11000
      // 評価合計と特別加減算の両方に11,000が表示される可能性がある
      const cells = screen.getAllByText('11,000', { exact: false });
      expect(cells.length).toBeGreaterThanOrEqual(1);
    });

    it('最終支給額が正しく計算される（控除なし、業績あり）', () => {
      const props = {
        ...defaultProps,
        inputs: {
          'period-001_staff-001': {
            staffId: 'staff-001',
            periodId: 'period-001',
            attendanceInputs: {},
            performanceInputs: { 'perf-001': 10 }, // 訪問件数10件 = 5000円
            isLocked: false
          }
        }
      };
      render(<StaffInput {...props} />);
      // 正規給与265000 + 業績5000 = 270000
      expect(screen.getByText('¥270,000')).toBeInTheDocument();
    });

    it('最終支給額が正しく計算される（控除あり、業績あり）', () => {
      const props = {
        ...defaultProps,
        inputs: {
          'period-001_staff-001': {
            staffId: 'staff-001',
            periodId: 'period-001',
            attendanceInputs: { 'att-001': 1 }, // 欠勤1回 = -10000円
            performanceInputs: { 'perf-001': 20 }, // 訪問件数20件 = +10000円
            isLocked: false
          }
        }
      };
      render(<StaffInput {...props} />);
      // 正規給与265000 - 10000 + 10000 = 265000
      expect(screen.getAllByText('¥265,000').length).toBeGreaterThanOrEqual(1);
    });

    it('旧給与が正しく表示される', () => {
      render(<StaffInput {...defaultProps} />);
      expect(screen.getByText('¥260,000')).toBeInTheDocument();
    });

    it('差分（旧給与 - 最終支給額）が正しく計算される', () => {
      render(<StaffInput {...defaultProps} />);
      // 旧給与260000 - 最終支給額265000 = -5000（マイナス表示）
      // HTMLでは「¥-5,000」形式で表示される
      expect(screen.getByText('¥-5,000')).toBeInTheDocument();
    });

    it('旧給与がない場合は差分が---と表示される', () => {
      const props = {
        ...defaultProps,
        records: [createTestRecord({ previousSalary: 0 })]
      };
      render(<StaffInput {...props} />);
      const dashes = screen.getAllByText('---');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('入力操作', () => {
    it('勤怠入力が変更できる', () => {
      render(<StaffInput {...defaultProps} />);
      const inputs = screen.getAllByRole('spinbutton');
      const attendanceInput = inputs[0]; // 最初の入力フィールド（欠勤）

      fireEvent.change(attendanceInput, { target: { value: '2' } });

      expect(defaultProps.onInputChange).toHaveBeenCalledWith(
        expect.objectContaining({
          staffId: 'staff-001',
          periodId: 'period-001',
          attendanceInputs: { 'att-001': 2 }
        })
      );
    });

    it('業績入力が変更できる', () => {
      render(<StaffInput {...defaultProps} />);
      const inputs = screen.getAllByRole('spinbutton');
      // 勤怠入力の後に業績入力がある
      const performanceInput = inputs[2]; // 訪問件数加算

      fireEvent.change(performanceInput, { target: { value: '15' } });

      expect(defaultProps.onInputChange).toHaveBeenCalledWith(
        expect.objectContaining({
          staffId: 'staff-001',
          periodId: 'period-001',
          performanceInputs: { 'perf-001': 15 }
        })
      );
    });

    it('評価期間を変更できる', () => {
      render(<StaffInput {...defaultProps} />);
      const select = screen.getByRole('combobox');

      fireEvent.change(select, { target: { value: 'period-002' } });

      expect(defaultProps.onPeriodChange).toHaveBeenCalledWith('period-002');
    });

    it('職員名クリックでダッシュボードが開く', () => {
      render(<StaffInput {...defaultProps} />);
      const staffName = screen.getByText('山田 太郎');

      fireEvent.click(staffName);

      expect(defaultProps.onOpenDashboard).toHaveBeenCalledWith('staff-001');
    });
  });

  describe('ロック機能', () => {
    it('確定ボタンで職員をロックできる', () => {
      render(<StaffInput {...defaultProps} />);
      const lockButton = screen.getByText('確定');

      fireEvent.click(lockButton);

      expect(defaultProps.onInputChange).toHaveBeenCalledWith(
        expect.objectContaining({
          staffId: 'staff-001',
          isLocked: true
        })
      );
    });

    it('ロック中の職員は入力が無効になる', () => {
      const props = {
        ...defaultProps,
        inputs: {
          'period-001_staff-001': {
            staffId: 'staff-001',
            periodId: 'period-001',
            attendanceInputs: {},
            performanceInputs: {},
            isLocked: true
          }
        }
      };
      render(<StaffInput {...props} />);

      const inputs = screen.getAllByRole('spinbutton');
      inputs.forEach(input => {
        expect(input).toBeDisabled();
      });
    });

    it('解除ボタンでロックを解除できる', () => {
      const props = {
        ...defaultProps,
        inputs: {
          'period-001_staff-001': {
            staffId: 'staff-001',
            periodId: 'period-001',
            attendanceInputs: {},
            performanceInputs: {},
            isLocked: true
          }
        }
      };
      render(<StaffInput {...props} />);
      const unlockButton = screen.getByText('解除');

      fireEvent.click(unlockButton);

      expect(defaultProps.onInputChange).toHaveBeenCalledWith(
        expect.objectContaining({
          staffId: 'staff-001',
          isLocked: false
        })
      );
    });
  });

  describe('閲覧専用モード', () => {
    it('期間がlockedの場合、閲覧専用警告が表示される', () => {
      const props = {
        ...defaultProps,
        selectedPeriodId: 'period-002' // lockedの期間
      };
      render(<StaffInput {...props} />);

      expect(screen.getByText('閲覧専用モード')).toBeInTheDocument();
      expect(screen.getByText(/この評価期間は確定済み/)).toBeInTheDocument();
    });

    it('期間がlockedの場合、入力が無効になる', () => {
      const props = {
        ...defaultProps,
        selectedPeriodId: 'period-002'
      };
      render(<StaffInput {...props} />);

      const inputs = screen.getAllByRole('spinbutton');
      inputs.forEach(input => {
        expect(input).toBeDisabled();
      });
    });

    it('期間がlockedの場合、保存ボタンが無効になる', () => {
      const props = {
        ...defaultProps,
        selectedPeriodId: 'period-002'
      };
      render(<StaffInput {...props} />);

      const saveButton = screen.getByText('💾 評価を履歴保存');
      expect(saveButton).toBeDisabled();
    });

    it('canEdit=falseの場合も閲覧専用になる', () => {
      const props = {
        ...defaultProps,
        canEdit: false
      };
      render(<StaffInput {...props} />);

      expect(screen.getByText('閲覧専用モード')).toBeInTheDocument();
    });
  });

  describe('複数職員の表示', () => {
    it('複数の職員が正しく表示される', () => {
      const props = {
        ...defaultProps,
        records: [
          createTestRecord({ staffId: 'staff-001', name: '山田 太郎' }),
          createTestRecord({ staffId: 'staff-002', name: '佐藤 花子', baseSalary: 280000 }),
          createTestRecord({ staffId: 'staff-003', name: '鈴木 一郎', baseSalary: 230000 })
        ]
      };
      render(<StaffInput {...props} />);

      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
      expect(screen.getByText('佐藤 花子')).toBeInTheDocument();
      expect(screen.getByText('鈴木 一郎')).toBeInTheDocument();
    });

    it('各職員の給与計算が独立している', () => {
      const props = {
        ...defaultProps,
        records: [
          createTestRecord({ staffId: 'staff-001', name: '山田 太郎', baseSalary: 250000, qualifications: ['qual-001'] }),
          createTestRecord({ staffId: 'staff-002', name: '佐藤 花子', baseSalary: 280000, qualifications: ['qual-002'] })
        ],
        inputs: {
          'period-001_staff-001': {
            staffId: 'staff-001',
            periodId: 'period-001',
            attendanceInputs: { 'att-001': 1 },
            performanceInputs: {},
            isLocked: false
          }
        }
      };
      render(<StaffInput {...props} />);

      // 山田: 250000 + 15000 - 10000 = 255000
      expect(screen.getByText('¥255,000')).toBeInTheDocument();
      // 佐藤: 280000 + 5000 = 285000 （正規給与と最終支給額の両方に表示される）
      const satoCells = screen.getAllByText('¥285,000');
      expect(satoCells.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('ボタン操作', () => {
    it('履歴保存ボタンクリックでonSaveHistoryが呼ばれる', () => {
      render(<StaffInput {...defaultProps} />);
      const saveButton = screen.getByText('💾 評価を履歴保存');

      fireEvent.click(saveButton);

      expect(defaultProps.onSaveHistory).toHaveBeenCalled();
    });
  });

  describe('エッジケース', () => {
    it('評価期間がない場合でもクラッシュしない', () => {
      const props = {
        ...defaultProps,
        master: createTestMasterData({ periods: [] })
      };
      // エラーが発生しないことを確認
      expect(() => render(<StaffInput {...props} />)).not.toThrow();
    });

    it('勤怠条件がない場合でも表示される', () => {
      const props = {
        ...defaultProps,
        master: createTestMasterData({ attendanceConditions: [] })
      };
      render(<StaffInput {...props} />);
      // 減額合計は0円 - 複数存在する可能性があるのでgetAllByTextを使用
      const deductionCells = screen.getAllByText('-¥0');
      expect(deductionCells.length).toBeGreaterThanOrEqual(1);
    });

    it('業績評価がない場合でも表示される', () => {
      const props = {
        ...defaultProps,
        master: createTestMasterData({ performanceEvaluations: [] })
      };
      render(<StaffInput {...props} />);
      // 評価合計は0円 - 複数存在する可能性があるのでgetAllByTextを使用
      const performanceCells = screen.getAllByText('+¥0');
      expect(performanceCells.length).toBeGreaterThanOrEqual(1);
    });

    it('職員がいない場合でもテーブルヘッダーは表示される', () => {
      const props = {
        ...defaultProps,
        records: []
      };
      render(<StaffInput {...props} />);
      expect(screen.getByText('氏名 / 状態')).toBeInTheDocument();
      expect(screen.getByText('基本給')).toBeInTheDocument();
    });
  });
});
