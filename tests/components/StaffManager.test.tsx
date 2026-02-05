/**
 * StaffManager コンポーネントテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '../utils/testUtils';
import { StaffManager } from '../../components/StaffManager';
import { createTestStaff, createTestMasterData } from '../utils/testUtils';
import { Staff } from '../../types';

// crypto.randomUUID モック
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
});

describe('StaffManager', () => {
  const mockMaster = createTestMasterData();
  let mockStaffList: Staff[];
  let setStaffList: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockStaffList = [
      createTestStaff({ id: 'staff-001', name: '山田 太郎', baseSalary: 250000 }),
      createTestStaff({ id: 'staff-002', name: '佐藤 花子', baseSalary: 230000, qualifications: ['qual-002'] }),
      createTestStaff({ id: 'staff-003', name: '鈴木 一郎', baseSalary: 200000, qualifications: [] }) // デフォルト値
    ];
    setStaffList = vi.fn();
  });

  describe('初期表示', () => {
    it('職員名簿のタイトルが表示される', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      expect(screen.getByText(/職員名簿・基本給管理/)).toBeInTheDocument();
    });

    it('職員一覧がテーブルに表示される', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      expect(screen.getByDisplayValue('山田 太郎')).toBeInTheDocument();
      expect(screen.getByDisplayValue('佐藤 花子')).toBeInTheDocument();
      expect(screen.getByDisplayValue('鈴木 一郎')).toBeInTheDocument();
    });

    it('基本給が正しく表示される', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      expect(screen.getByText('¥250,000')).toBeInTheDocument();
      expect(screen.getByText('¥230,000')).toBeInTheDocument();
      expect(screen.getByText('¥200,000')).toBeInTheDocument();
    });

  });

  describe('職員の削除', () => {
    it('削除ボタンをクリックすると確認モーダルが表示される', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      const deleteButtons = screen.getAllByTitle('削除');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('職員を削除しますか？')).toBeInTheDocument();
      expect(screen.getByText(/山田 太郎/)).toBeInTheDocument();
    });

    it('削除確認でキャンセルするとモーダルが閉じる', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      const deleteButtons = screen.getAllByTitle('削除');
      fireEvent.click(deleteButtons[0]);

      const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
      fireEvent.click(cancelButton);

      expect(screen.queryByText('職員を削除しますか？')).not.toBeInTheDocument();
    });

    it('削除確認で削除を実行すると職員が削除される', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      const deleteButtons = screen.getAllByTitle('削除');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: '削除する' });
      fireEvent.click(confirmButton);

      expect(setStaffList).toHaveBeenCalled();
    });
  });

  describe('職員情報の編集', () => {
    it('名前を編集すると更新される', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      const nameInput = screen.getByDisplayValue('山田 太郎');
      fireEvent.change(nameInput, { target: { value: '山田 次郎' } });

      expect(setStaffList).toHaveBeenCalled();
    });
  });

  describe('資格の選択', () => {
    it('資格ボタンが表示される', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      // マスタの資格がボタンとして表示される
      const qualButtons = screen.getAllByText('介護福祉士');
      expect(qualButtons.length).toBeGreaterThan(0);
    });

    it('選択中の資格には★マークが付く', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      // 優先資格には★が表示される
      expect(screen.getAllByText('★').length).toBeGreaterThan(0);
    });

    it('資格ボタンをクリックすると選択状態が変わる', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      // 最初の介護福祉士ボタンをクリック
      const qualButtons = screen.getAllByText('介護福祉士');
      fireEvent.click(qualButtons[0]);

      expect(setStaffList).toHaveBeenCalled();
    });
  });

  describe('基本給未設定フィルター', () => {
    it('未設定の職員がいる場合、警告バナーが表示される', () => {
      const setShowUnconfiguredOnly = vi.fn();
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
          setShowUnconfiguredOnly={setShowUnconfiguredOnly}
        />
      );

      expect(screen.getByText(/基本給が未設定/)).toBeInTheDocument();
      expect(screen.getByText(/1名/)).toBeInTheDocument();
    });

    it('フィルターボタンをクリックすると未設定のみ表示に切り替わる', () => {
      const setShowUnconfiguredOnly = vi.fn();
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
          setShowUnconfiguredOnly={setShowUnconfiguredOnly}
        />
      );

      const filterButton = screen.getByRole('button', { name: /未設定のみ/ });
      fireEvent.click(filterButton);

      expect(setShowUnconfiguredOnly).toHaveBeenCalledWith(true);
    });

    it('全員ボタンと未設定のみボタンが常に表示される', () => {
      const setShowUnconfiguredOnly = vi.fn();
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
          setShowUnconfiguredOnly={setShowUnconfiguredOnly}
        />
      );

      expect(screen.getByRole('button', { name: '全員' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /未設定のみ/ })).toBeInTheDocument();
    });

    it('フィルターON時は未設定の職員のみ表示される', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
          showUnconfiguredOnly={true}
          setShowUnconfiguredOnly={vi.fn()}
        />
      );

      // 基本給200000（デフォルト）の職員のみ表示
      // 鈴木一郎のみがテーブルに表示される
      const rows = screen.getAllByRole('row');
      // ヘッダー行 + データ行1件
      expect(rows.length).toBe(2);
    });
  });

  describe('SmartHR連携', () => {
    it('SmartHR同期ボタンが表示される', () => {
      const onOpenSyncDialog = vi.fn();
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
          onOpenSyncDialog={onOpenSyncDialog}
          smarthrConfigured={true}
        />
      );

      expect(screen.getByRole('button', { name: /SmartHRから同期/ })).toBeInTheDocument();
    });

    it('SmartHR未設定時は同期ボタンが無効', () => {
      const onOpenSyncDialog = vi.fn();
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
          onOpenSyncDialog={onOpenSyncDialog}
          smarthrConfigured={false}
        />
      );

      const syncButton = screen.getByRole('button', { name: /SmartHRから同期/ });
      expect(syncButton).toBeDisabled();
    });

    it('同期ボタンをクリックするとコールバックが呼ばれる', () => {
      const onOpenSyncDialog = vi.fn();
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
          onOpenSyncDialog={onOpenSyncDialog}
          smarthrConfigured={true}
        />
      );

      const syncButton = screen.getByRole('button', { name: /SmartHRから同期/ });
      fireEvent.click(syncButton);

      expect(onOpenSyncDialog).toHaveBeenCalled();
    });
  });

  describe('編集権限', () => {
    it('canEdit=falseの場合、名前入力が無効になる', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
          canEdit={false}
        />
      );

      const nameInput = screen.getByDisplayValue('山田 太郎');
      expect(nameInput).toBeDisabled();
    });

    it('canEdit=falseの場合、給与管理ボタンが表示されない', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
          canEdit={false}
        />
      );

      expect(screen.queryByRole('button', { name: '給与管理' })).not.toBeInTheDocument();
    });
  });

  describe('給与管理モーダル', () => {
    it('給与管理ボタンをクリックするとモーダルが開く', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      const salaryButtons = screen.getAllByRole('button', { name: '給与管理' });
      fireEvent.click(salaryButtons[0]);

      expect(screen.getByText('💰 給与管理')).toBeInTheDocument();
    });
  });

  describe('退職者の表示', () => {
    it('退職者は半透明で表示される', () => {
      const staffWithResigned = [
        ...mockStaffList,
        createTestStaff({ id: 'staff-004', name: '退職 太郎', resignedAt: '2024-03-31' })
      ];

      render(
        <StaffManager
          staffList={staffWithResigned}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      expect(screen.getByDisplayValue('退職 太郎')).toBeInTheDocument();
    });
  });

  describe('評価対象外フラグ', () => {
    it('評価対象ヘッダーが表示される', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      expect(screen.getByText('評価対象')).toBeInTheDocument();
    });

    it('デフォルトで「対象」ボタンが表示される', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      const targetButtons = screen.getAllByRole('button', { name: '対象' });
      expect(targetButtons.length).toBe(3); // 3人の職員
    });

    it('評価対象外の職員には「対象外」ボタンが表示される', () => {
      const staffWithExcluded = [
        ...mockStaffList,
        createTestStaff({ id: 'staff-004', name: '対象外 太郎', excludedFromEvaluation: true })
      ];

      render(
        <StaffManager
          staffList={staffWithExcluded}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      const excludedButton = screen.getByRole('button', { name: '対象外' });
      expect(excludedButton).toBeInTheDocument();
    });

    it('対象ボタンをクリックすると対象外に切り替わる', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      const targetButtons = screen.getAllByRole('button', { name: '対象' });
      fireEvent.click(targetButtons[0]);

      expect(setStaffList).toHaveBeenCalled();
      // setStaffListの呼び出し引数を確認
      const updateFn = setStaffList.mock.calls[0][0];
      const result = updateFn(mockStaffList);
      expect(result[0].excludedFromEvaluation).toBe(true);
    });

    it('対象外ボタンをクリックすると対象に切り替わる', () => {
      const staffWithExcluded = [
        createTestStaff({ id: 'staff-001', name: '対象外 太郎', excludedFromEvaluation: true })
      ];

      render(
        <StaffManager
          staffList={staffWithExcluded}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
        />
      );

      const excludedButton = screen.getByRole('button', { name: '対象外' });
      fireEvent.click(excludedButton);

      expect(setStaffList).toHaveBeenCalled();
      const updateFn = setStaffList.mock.calls[0][0];
      const result = updateFn(staffWithExcluded);
      expect(result[0].excludedFromEvaluation).toBe(false);
    });

    it('canEdit=falseの場合、対象ボタンが無効になる', () => {
      render(
        <StaffManager
          staffList={mockStaffList}
          setStaffList={setStaffList}
          selectedOfficeId="office-001"
          master={mockMaster}
          canEdit={false}
        />
      );

      const targetButtons = screen.getAllByRole('button', { name: '対象' });
      expect(targetButtons[0]).toBeDisabled();
    });
  });
});
