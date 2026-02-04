/**
 * BaseSalaryHistoryEditor コンポーネントテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../utils/testUtils';
import { BaseSalaryHistoryEditor } from '../../components/BaseSalaryHistoryEditor';
import { createTestStaff } from '../utils/testUtils';
import { Staff } from '../../types';

// crypto.randomUUID モック
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
});

describe('BaseSalaryHistoryEditor', () => {
  let mockStaff: Staff;
  let onSave: ReturnType<typeof vi.fn>;
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockStaff = createTestStaff({
      name: '山田 太郎',
      baseSalary: 250000,
      baseSalaryHistory: [
        { id: 'rev-001', effectiveMonth: '2020-04', amount: 220000, memo: '入社時', createdAt: '2020-04-01T00:00:00Z' },
        { id: 'rev-002', effectiveMonth: '2024-04', amount: 250000, memo: '昇給', createdAt: '2024-04-01T00:00:00Z' }
      ]
    });
    onSave = vi.fn();
    onClose = vi.fn();
  });

  describe('初期表示', () => {
    it('モーダルタイトルが表示される', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      expect(screen.getByText('💰 給与管理')).toBeInTheDocument();
    });

    it('職員名が表示される', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    it('現在の基本給が表示される', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      // 現在の基本給と履歴の両方に¥250,000が表示される可能性があるためgetAllByTextを使用
      const salaryTexts = screen.getAllByText('¥250,000');
      expect(salaryTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('改定履歴が表示される', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      expect(screen.getByText('2020年04月')).toBeInTheDocument();
      expect(screen.getByText('2024年04月')).toBeInTheDocument();
      expect(screen.getByText('¥220,000')).toBeInTheDocument();
    });

    it('履歴件数が表示される', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      expect(screen.getByText('2件')).toBeInTheDocument();
    });

    it('メモが表示される', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      expect(screen.getByText('(入社時)')).toBeInTheDocument();
      expect(screen.getByText('(昇給)')).toBeInTheDocument();
    });
  });

  describe('履歴がない場合', () => {
    it('「改定履歴はまだありません」が表示される', () => {
      const staffNoHistory = createTestStaff({ baseSalaryHistory: [] });
      render(
        <BaseSalaryHistoryEditor
          staff={staffNoHistory}
          onSave={onSave}
          onClose={onClose}
        />
      );

      expect(screen.getByText('改定履歴はまだありません')).toBeInTheDocument();
    });
  });

  describe('改定の追加', () => {
    it('「改定を追加」ボタンが表示される', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      expect(screen.getByRole('button', { name: /改定を追加/ })).toBeInTheDocument();
    });

    it('追加ボタンをクリックするとフォームが表示される', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      const addButton = screen.getByRole('button', { name: /改定を追加/ });
      fireEvent.click(addButton);

      // フォームタイトルで確認
      expect(screen.getByText('新しい改定を追加')).toBeInTheDocument();
      // フォームのラベルは複数存在しうるのでgetAllByTextを使用
      const monthLabels = screen.getAllByText('適用月');
      expect(monthLabels.length).toBeGreaterThan(0);
      const amountLabels = screen.getAllByText('金額');
      expect(amountLabels.length).toBeGreaterThan(0);
      // メモは「メモ（任意）」という形式なのでパターンマッチ
      expect(screen.getAllByText(/メモ/).length).toBeGreaterThan(0);
    });

    it('フォームでキャンセルするとフォームが閉じる', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      const addButton = screen.getByRole('button', { name: /改定を追加/ });
      fireEvent.click(addButton);

      // フォーム内のキャンセルボタンを探す（emerald背景のフォーム内）
      const cancelButtons = screen.getAllByRole('button', { name: 'キャンセル' });
      // 最初のキャンセルボタンはフォーム内のもの
      fireEvent.click(cancelButtons[0]);

      expect(screen.queryByText('新しい改定を追加')).not.toBeInTheDocument();
    });

    it('有効な値を入力して追加すると履歴が増える', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      // 初期状態では2件
      expect(screen.getByText('2件')).toBeInTheDocument();

      // 追加フォームを開く
      const addButton = screen.getByRole('button', { name: /改定を追加/ });
      fireEvent.click(addButton);

      // 金額入力
      const inputs = screen.getAllByRole('spinbutton');
      const amountInput = inputs[0];
      fireEvent.change(amountInput, { target: { value: '280000' } });

      // 追加ボタンをクリック
      const submitButton = screen.getByRole('button', { name: '追加' });
      fireEvent.click(submitButton);

      // 件数が増える
      expect(screen.getByText('3件')).toBeInTheDocument();
    });

    it('金額が0以下の場合、追加ボタンが無効になる', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      const addButton = screen.getByRole('button', { name: /改定を追加/ });
      fireEvent.click(addButton);

      const inputs = screen.getAllByRole('spinbutton');
      const amountInput = inputs[0];
      fireEvent.change(amountInput, { target: { value: '0' } });

      const submitButton = screen.getByRole('button', { name: '追加' });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('改定の削除', () => {
    it('削除ボタンをクリックすると確認モーダルが表示される', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      const deleteButtons = screen.getAllByTitle('削除');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('改定履歴を削除しますか？')).toBeInTheDocument();
    });

    it('削除確認でキャンセルするとモーダルが閉じる', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      const deleteButtons = screen.getAllByTitle('削除');
      fireEvent.click(deleteButtons[0]);

      // 確認モーダル内のキャンセルボタン
      const cancelButtons = screen.getAllByRole('button', { name: 'キャンセル' });
      // 最後のキャンセルボタン（削除確認モーダル内）をクリック
      fireEvent.click(cancelButtons[cancelButtons.length - 1]);

      expect(screen.queryByText('改定履歴を削除しますか？')).not.toBeInTheDocument();
    });

    it('削除を確定すると履歴が減る', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      // 最初の履歴を削除
      const deleteButtons = screen.getAllByTitle('削除');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: '削除する' });
      fireEvent.click(confirmButton);

      // 件数が減っている
      expect(screen.getByText('1件')).toBeInTheDocument();
    });
  });

  describe('保存とキャンセル', () => {
    it('「保存して閉じる」をクリックするとonSaveが呼ばれる', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      const saveButton = screen.getByRole('button', { name: '保存して閉じる' });
      fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        id: mockStaff.id,
        name: mockStaff.name
      }));
      expect(onClose).toHaveBeenCalled();
    });

    it('キャンセルをクリックするとonCloseが呼ばれる', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      // フッターのキャンセルボタンを探す（border-t-があるfooter内）
      const footer = document.querySelector('.border-t');
      const cancelButton = footer?.querySelector('button');
      if (cancelButton) {
        fireEvent.click(cancelButton);
      }

      expect(onClose).toHaveBeenCalled();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('背景をクリックするとonCloseが呼ばれる', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      // backdrop-blur-smクラスを持つ要素（背景）をクリック
      const backdrop = document.querySelector('.backdrop-blur-sm');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalled();
      }
    });
  });

  describe('変更後の保存', () => {
    it('履歴を追加してから保存すると更新されたデータが渡される', () => {
      render(
        <BaseSalaryHistoryEditor
          staff={mockStaff}
          onSave={onSave}
          onClose={onClose}
        />
      );

      // 追加フォームを開く
      const addButton = screen.getByRole('button', { name: /改定を追加/ });
      fireEvent.click(addButton);

      // 値を入力
      const inputs = screen.getAllByRole('spinbutton');
      const amountInput = inputs[0];
      fireEvent.change(amountInput, { target: { value: '280000' } });

      // 追加
      const submitButton = screen.getByRole('button', { name: '追加' });
      fireEvent.click(submitButton);

      // 保存
      const saveButton = screen.getByRole('button', { name: '保存して閉じる' });
      fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalled();
      const savedStaff = onSave.mock.calls[0][0];
      expect(savedStaff.baseSalaryHistory.length).toBe(3);
      expect(savedStaff.baseSalary).toBe(280000); // 最新の基本給に更新
    });
  });
});
