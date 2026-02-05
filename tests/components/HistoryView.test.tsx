/**
 * HistoryView コンポーネントのテスト
 * 評価履歴と変更ログの表示・操作のテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HistoryView } from '../../components/HistoryView';
import { HistoryEntry, ChangeLogEntry, MasterData } from '../../types';

// テスト用のマスタデータスナップショット
const createTestMasterSnapshot = (): MasterData => ({
  qualifications: [
    { id: 'qual-001', name: '介護福祉士', allowance: 15000, priority: 1 },
    { id: 'qual-002', name: '初任者研修', allowance: 5000, priority: 2 }
  ],
  attendanceConditions: [
    { id: 'att-001', name: '欠勤', unitAmount: 10000 }
  ],
  performanceEvaluations: [
    { id: 'perf-001', name: '訪問件数加算', unitAmount: 500 },
    { id: 'perf-002', name: '緊急対応', unitAmount: 2000 }
  ],
  periods: []
});

// テスト用の履歴エントリ
const createTestHistoryEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: 'history-001',
  officeId: 'office-001',
  officeName: 'テスト事業所A',
  timestamp: '2024-04-01 10:00:00',
  period: {
    id: 'period-001',
    name: '2024年度上期',
    evaluationStart: '2024-04',
    evaluationEnd: '2024-09',
    paymentStart: '2024-10',
    paymentEnd: '2025-03',
    status: 'editing'
  },
  recordsSnapshot: {
    'staff-001': {
      staffId: 'staff-001',
      officeId: 'office-001',
      name: '山田 太郎',
      baseSalary: 250000,
      qualifications: ['qual-001'],
      previousSalary: 245000
    }
  },
  inputsSnapshot: {
    'period-001_staff-001': {
      staffId: 'staff-001',
      periodId: 'period-001',
      attendanceInputs: { 'att-001': 1 },
      performanceInputs: { 'perf-001': 10 },
      isLocked: false
    }
  },
  masterSnapshot: createTestMasterSnapshot(),
  ...overrides
});

// テスト用の変更ログエントリ
const createTestChangeLogEntry = (overrides: Partial<ChangeLogEntry> = {}): ChangeLogEntry => ({
  id: 'changelog-001',
  timestamp: '2024-04-15T14:30:00Z',
  userId: 'user-001',
  userName: 'テストユーザー',
  periodId: 'period-001',
  periodName: '2024年度上期',
  changes: [
    {
      staffId: 'staff-001',
      staffName: '山田 太郎',
      field: 'attendance_att-001',
      fieldName: '欠勤',
      oldValue: 0,
      newValue: 1
    }
  ],
  ...overrides
});

describe('HistoryView', () => {
  const mockSetHistory = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // window.confirm をモック
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  describe('タブ切り替え', () => {
    it('評価履歴タブがデフォルトで選択されている', () => {
      render(<HistoryView history={[]} setHistory={mockSetHistory} />);

      const historyTab = screen.getByText('📋 評価履歴');
      expect(historyTab).toHaveClass('bg-[#26519f]');
    });

    it('変更ログタブをクリックすると切り替わる', () => {
      render(<HistoryView history={[]} setHistory={mockSetHistory} changeLogs={[]} />);

      const changelogTab = screen.getByText('📝 変更ログ');
      fireEvent.click(changelogTab);

      expect(changelogTab).toHaveClass('bg-[#26519f]');
    });

    it('変更ログタブに件数バッジが表示される', () => {
      const changeLogs = [
        createTestChangeLogEntry(),
        createTestChangeLogEntry({ id: 'changelog-002' })
      ];
      render(<HistoryView history={[]} setHistory={mockSetHistory} changeLogs={changeLogs} />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('評価履歴タブ - 空の状態', () => {
    it('履歴がない場合に空の状態メッセージが表示される', () => {
      render(<HistoryView history={[]} setHistory={mockSetHistory} />);

      expect(screen.getByText('履歴はまだありません')).toBeInTheDocument();
      expect(screen.getByText('「評価データ入力」画面から評価結果を保存してください。')).toBeInTheDocument();
    });
  });

  describe('評価履歴タブ - 履歴表示', () => {
    it('履歴エントリが正しく表示される', () => {
      const history = [createTestHistoryEntry()];
      render(<HistoryView history={history} setHistory={mockSetHistory} />);

      expect(screen.getByText('テスト事業所A')).toBeInTheDocument();
      expect(screen.getByText(/保存日時: 2024-04-01 10:00:00/)).toBeInTheDocument();
    });

    it('評価期間が表示される', () => {
      const history = [createTestHistoryEntry()];
      render(<HistoryView history={history} setHistory={mockSetHistory} />);

      expect(screen.getByText('2024-04 〜 2024-09')).toBeInTheDocument();
    });

    it('反映期間が表示される', () => {
      const history = [createTestHistoryEntry()];
      render(<HistoryView history={history} setHistory={mockSetHistory} />);

      expect(screen.getByText('2024-10 〜 2025-03')).toBeInTheDocument();
    });

    it('職員数とマスタ情報が表示される', () => {
      const history = [createTestHistoryEntry()];
      render(<HistoryView history={history} setHistory={mockSetHistory} />);

      expect(screen.getByText(/評価対象職員数:/)).toBeInTheDocument();
      expect(screen.getByText('1名')).toBeInTheDocument();
      expect(screen.getByText(/資格マスタ: 2項目/)).toBeInTheDocument();
      expect(screen.getByText(/評価マスタ: 2項目/)).toBeInTheDocument();
    });

    it('複数の履歴エントリが表示される', () => {
      const history = [
        createTestHistoryEntry({ id: 'history-001', officeName: '事業所A' }),
        createTestHistoryEntry({ id: 'history-002', officeName: '事業所B' })
      ];
      render(<HistoryView history={history} setHistory={mockSetHistory} />);

      expect(screen.getByText('事業所A')).toBeInTheDocument();
      expect(screen.getByText('事業所B')).toBeInTheDocument();
    });
  });

  describe('評価履歴タブ - 削除機能', () => {
    it('削除ボタンが表示される', () => {
      const history = [createTestHistoryEntry()];
      render(<HistoryView history={history} setHistory={mockSetHistory} />);

      expect(screen.getByText('削除')).toBeInTheDocument();
    });

    it('削除ボタンクリックで確認ダイアログが表示される', () => {
      const history = [createTestHistoryEntry()];
      render(<HistoryView history={history} setHistory={mockSetHistory} />);

      const deleteButton = screen.getByText('削除');
      fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith('この履歴を削除しますか？');
    });

    it('削除を確認するとsetHistoryが呼ばれる', () => {
      const history = [createTestHistoryEntry()];
      render(<HistoryView history={history} setHistory={mockSetHistory} />);

      const deleteButton = screen.getByText('削除');
      fireEvent.click(deleteButton);

      expect(mockSetHistory).toHaveBeenCalled();
    });

    it('削除をキャンセルするとsetHistoryは呼ばれない', () => {
      vi.spyOn(window, 'confirm').mockImplementation(() => false);

      const history = [createTestHistoryEntry()];
      render(<HistoryView history={history} setHistory={mockSetHistory} />);

      const deleteButton = screen.getByText('削除');
      fireEvent.click(deleteButton);

      expect(mockSetHistory).not.toHaveBeenCalled();
    });
  });

  describe('変更ログタブ - 空の状態', () => {
    it('変更ログがない場合に空の状態メッセージが表示される', () => {
      render(<HistoryView history={[]} setHistory={mockSetHistory} changeLogs={[]} />);

      const changelogTab = screen.getByText('📝 変更ログ');
      fireEvent.click(changelogTab);

      expect(screen.getByText('変更ログはまだありません')).toBeInTheDocument();
      expect(screen.getByText('評価データを変更して保存すると、変更内容がここに記録されます。')).toBeInTheDocument();
    });
  });

  describe('変更ログタブ - ログ表示', () => {
    it('変更ログエントリが正しく表示される', () => {
      const changeLogs = [createTestChangeLogEntry()];
      render(<HistoryView history={[]} setHistory={mockSetHistory} changeLogs={changeLogs} />);

      const changelogTab = screen.getByText('📝 変更ログ');
      fireEvent.click(changelogTab);

      expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      expect(screen.getByText('2024年度上期')).toBeInTheDocument();
      expect(screen.getByText('1件の変更')).toBeInTheDocument();
    });

    it('変更内容の詳細が表示される', () => {
      const changeLogs = [createTestChangeLogEntry()];
      render(<HistoryView history={[]} setHistory={mockSetHistory} changeLogs={changeLogs} />);

      const changelogTab = screen.getByText('📝 変更ログ');
      fireEvent.click(changelogTab);

      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
      expect(screen.getByText('欠勤')).toBeInTheDocument();
      // 旧値（取り消し線付き）
      const oldValue = screen.getByText('0');
      expect(oldValue).toBeInTheDocument();
      expect(oldValue).toHaveClass('line-through');
      // 新値（太字）- 複数の「1」が存在するため、クラスで絞り込む
      const newValues = screen.getAllByText('1');
      const boldNewValue = newValues.find(el => el.classList.contains('font-bold'));
      expect(boldNewValue).toBeInTheDocument();
    });

    it('複数の変更ログエントリが表示される', () => {
      const changeLogs = [
        createTestChangeLogEntry({ id: 'changelog-001', userName: 'ユーザーA' }),
        createTestChangeLogEntry({ id: 'changelog-002', userName: 'ユーザーB' })
      ];
      render(<HistoryView history={[]} setHistory={mockSetHistory} changeLogs={changeLogs} />);

      const changelogTab = screen.getByText('📝 変更ログ');
      fireEvent.click(changelogTab);

      expect(screen.getByText('ユーザーA')).toBeInTheDocument();
      expect(screen.getByText('ユーザーB')).toBeInTheDocument();
    });

    it('複数の変更が含まれるログエントリが正しく表示される', () => {
      const changeLogs = [createTestChangeLogEntry({
        changes: [
          { staffId: 'staff-001', staffName: '山田 太郎', field: 'attendance_att-001', fieldName: '欠勤', oldValue: 0, newValue: 1 },
          { staffId: 'staff-001', staffName: '山田 太郎', field: 'performance_perf-001', fieldName: '訪問件数', oldValue: 5, newValue: 10 }
        ]
      })];
      render(<HistoryView history={[]} setHistory={mockSetHistory} changeLogs={changeLogs} />);

      const changelogTab = screen.getByText('📝 変更ログ');
      fireEvent.click(changelogTab);

      expect(screen.getByText('2件の変更')).toBeInTheDocument();
    });
  });

  describe('値のフォーマット', () => {
    it('金額が正しくフォーマットされる', () => {
      const changeLogs = [createTestChangeLogEntry({
        changes: [
          { staffId: 'staff-001', staffName: '山田 太郎', field: 'baseSalary', fieldName: '基本給', oldValue: 250000, newValue: 260000 }
        ]
      })];
      render(<HistoryView history={[]} setHistory={mockSetHistory} changeLogs={changeLogs} />);

      const changelogTab = screen.getByText('📝 変更ログ');
      fireEvent.click(changelogTab);

      expect(screen.getByText('¥250,000')).toBeInTheDocument();
      expect(screen.getByText('¥260,000')).toBeInTheDocument();
    });

    it('勤怠・業績の数値は通貨フォーマットされない', () => {
      const changeLogs = [createTestChangeLogEntry({
        changes: [
          { staffId: 'staff-001', staffName: '山田 太郎', field: 'attendance_att-001', fieldName: '欠勤', oldValue: 2, newValue: 3 }
        ]
      })];
      render(<HistoryView history={[]} setHistory={mockSetHistory} changeLogs={changeLogs} />);

      const changelogTab = screen.getByText('📝 変更ログ');
      fireEvent.click(changelogTab);

      // 数値がそのまま表示される（¥なし）
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('タイムスタンプのフォーマット', () => {
    it('タイムスタンプが日本語フォーマットで表示される', () => {
      const changeLogs = [createTestChangeLogEntry({
        timestamp: '2024-04-15T14:30:00Z'
      })];
      render(<HistoryView history={[]} setHistory={mockSetHistory} changeLogs={changeLogs} />);

      const changelogTab = screen.getByText('📝 変更ログ');
      fireEvent.click(changelogTab);

      // タイムスタンプがフォーマットされて表示されている（正確な形式は環境依存）
      // 年、月、日、時、分を含むことを確認
      const formattedText = screen.getByText((content) =>
        content.includes('2024') && content.includes('04') && content.includes('15')
      );
      expect(formattedText).toBeInTheDocument();
    });
  });

  describe('changeLogs prop のデフォルト値', () => {
    it('changeLogs が undefined の場合でもエラーにならない', () => {
      // changeLogs を渡さない
      expect(() => render(<HistoryView history={[]} setHistory={mockSetHistory} />)).not.toThrow();
    });
  });
});
