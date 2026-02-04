/**
 * Layout コンポーネントテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../utils/testUtils';
import { Layout, TabType } from '../../components/Layout';
import { createTestOffice, createTestUser } from '../utils/testUtils';
import { BusinessType, Office } from '../../types';

describe('Layout', () => {
  let mockOffices: Office[];
  let setActiveTab: ReturnType<typeof vi.fn>;
  let setSelectedOfficeId: ReturnType<typeof vi.fn>;
  const defaultPeriodConfig = {
    evaluationStart: '2024-04',
    evaluationEnd: '2024-09',
    paymentStart: '2024-10',
    paymentEnd: '2025-03'
  };

  beforeEach(() => {
    mockOffices = [
      createTestOffice({ id: 'office-001', name: '訪問介護事業所A', type: BusinessType.HOME_CARE }),
      createTestOffice({ id: 'office-002', name: '訪問介護事業所B', type: BusinessType.HOME_CARE }),
      createTestOffice({ id: 'office-003', name: '訪問看護事業所C', type: BusinessType.HOME_NURSING })
    ];
    setActiveTab = vi.fn();
    setSelectedOfficeId = vi.fn();
  });

  describe('初期表示', () => {
    it('アプリタイトルが表示される', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
        >
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByText('訪問系評価登録システム')).toBeInTheDocument();
    });

    it('子要素が表示される', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
        >
          <div>Test Content</div>
        </Layout>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('給与反映期間が表示される', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
        >
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByText('給与反映期間')).toBeInTheDocument();
      expect(screen.getByText(/2024-10.*2025-03/)).toBeInTheDocument();
    });
  });

  describe('メニュー表示', () => {
    it('評価管理グループが表示される', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
        >
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByText(/評価管理/)).toBeInTheDocument();
      expect(screen.getByText(/職員名簿/)).toBeInTheDocument();
      expect(screen.getByText(/評価データ入力簿/)).toBeInTheDocument();
    });

    it('データ管理グループが表示される', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
        >
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByText(/データ管理/)).toBeInTheDocument();
      expect(screen.getByText(/評価履歴/)).toBeInTheDocument();
      expect(screen.getByText(/職員分析/)).toBeInTheDocument();
      expect(screen.getByText(/CSV出力/)).toBeInTheDocument();
    });

    it('管理者の場合、システム設定グループが表示される', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
          isAdmin={true}
        >
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByText(/システム設定/)).toBeInTheDocument();
      expect(screen.getByText(/マスタ管理/)).toBeInTheDocument();
      expect(screen.getByText(/SmartHR連携/)).toBeInTheDocument();
      expect(screen.getByText(/ユーザー管理/)).toBeInTheDocument();
    });

    it('管理者でない場合、システム設定グループが表示されない', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
          isAdmin={false}
        >
          <div>Content</div>
        </Layout>
      );

      expect(screen.queryByText(/システム設定/)).not.toBeInTheDocument();
      expect(screen.queryByText(/マスタ管理/)).not.toBeInTheDocument();
    });
  });

  describe('タブ切り替え', () => {
    it('職員名簿タブをクリックするとsetActiveTabが呼ばれる', () => {
      render(
        <Layout
          activeTab="staff"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
        >
          <div>Content</div>
        </Layout>
      );

      const staffListTab = screen.getByText(/職員名簿/);
      fireEvent.click(staffListTab);

      expect(setActiveTab).toHaveBeenCalledWith('staff_list');
    });

    it('選択中のタブがハイライトされる', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
        >
          <div>Content</div>
        </Layout>
      );

      // 選択中のタブはスタイルが異なる（具体的なクラス名は実装依存）
      const staffListButton = screen.getByRole('button', { name: /職員名簿/ });
      expect(staffListButton.className).toContain('font-semibold');
    });
  });

  describe('業態カテゴリ切り替え', () => {
    it('業態セレクトボックスが表示される', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
        >
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByText('業態カテゴリ')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('訪問介護と訪問看護の選択肢がある', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
        >
          <div>Content</div>
        </Layout>
      );

      const select = screen.getByRole('combobox');
      expect(select).toContainHTML('訪問介護');
      expect(select).toContainHTML('訪問看護');
    });

    it('業態を変更すると事業所リストがフィルタされる', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
        >
          <div>Content</div>
        </Layout>
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: BusinessType.HOME_NURSING } });

      // サイドバーをチェック
      const sidebar = document.querySelector('aside');
      // 訪問看護事業所のみが表示される
      expect(sidebar?.textContent).toContain('訪問看護事業所C');
      // 訪問介護事業所は非表示
      expect(sidebar?.textContent).not.toContain('訪問介護事業所A');
    });
  });

  describe('事業所切り替え', () => {
    it('事業所ボタンがサイドバーに表示される', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
        >
          <div>Content</div>
        </Layout>
      );

      const sidebar = document.querySelector('aside');
      expect(sidebar?.textContent).toContain('訪問介護事業所A');
      expect(sidebar?.textContent).toContain('訪問介護事業所B');
    });

    it('事業所をクリックするとsetSelectedOfficeIdが呼ばれる', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
        >
          <div>Content</div>
        </Layout>
      );

      const sidebar = document.querySelector('aside');
      const buttons = sidebar?.querySelectorAll('button');
      const officeButton = Array.from(buttons || []).find(b => b.textContent?.includes('訪問介護事業所B'));
      if (officeButton) {
        fireEvent.click(officeButton);
      }

      expect(setSelectedOfficeId).toHaveBeenCalledWith('office-002');
    });

    it('選択中の事業所がハイライトされる', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
        >
          <div>Content</div>
        </Layout>
      );

      // サイドバー内の事業所ボタンを探す
      const sidebar = document.querySelector('aside');
      const selectedButton = sidebar?.querySelector('button.font-semibold');
      expect(selectedButton).not.toBeNull();
    });
  });

  describe('全事業所表示（管理者専用）', () => {
    it('管理者の場合、全事業所ボタンが表示される', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
          isAdmin={true}
        >
          <div>Content</div>
        </Layout>
      );

      // サイドバー内の全事業所ボタンを探す
      const sidebar = document.querySelector('aside');
      expect(sidebar?.textContent).toContain('全事業所');
    });

    it('管理者でない場合、全事業所ボタンが表示されない', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
          isAdmin={false}
        >
          <div>Content</div>
        </Layout>
      );

      // サイドバー内に全事業所ボタンがない
      const sidebar = document.querySelector('aside');
      const buttons = sidebar?.querySelectorAll('button');
      const hasAllOfficesButton = Array.from(buttons || []).some(b => b.textContent?.includes('全事業所'));
      expect(hasAllOfficesButton).toBe(false);
    });

    it('全事業所をクリックするとselectedOfficeIdが"all"になる', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
          isAdmin={true}
        >
          <div>Content</div>
        </Layout>
      );

      // サイドバー内の全事業所ボタンをクリック
      const sidebar = document.querySelector('aside');
      const buttons = sidebar?.querySelectorAll('button');
      const allOfficesButton = Array.from(buttons || []).find(b => b.textContent?.includes('全事業所'));
      if (allOfficesButton) {
        fireEvent.click(allOfficesButton);
      }

      expect(setSelectedOfficeId).toHaveBeenCalledWith('all');
    });

    it('全事業所選択時、ヘッダーに「全事業所表示」が表示される', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="all"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
          isAdmin={true}
        >
          <div>Content</div>
        </Layout>
      );

      // ヘッダー部分に全事業所表示が表示される
      const header = screen.getByRole('banner');
      expect(header).toHaveTextContent('全事業所表示');
    });
  });

  describe('ユーザー情報表示', () => {
    it('ユーザー名が表示される', () => {
      const mockUser = createTestUser({ displayName: 'テスト管理者' });
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
          user={mockUser}
        >
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByText('テスト管理者')).toBeInTheDocument();
    });

    it('管理者ロールのバッジが表示される', () => {
      const mockUser = createTestUser({ role: 'admin' });
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
          user={mockUser}
        >
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByText('管理者')).toBeInTheDocument();
    });

    it('一般ユーザーロールのバッジが表示される', () => {
      const mockUser = createTestUser({ role: 'user' });
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
          user={mockUser}
        >
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByText('一般')).toBeInTheDocument();
    });

    it('ログアウトボタンが表示される', () => {
      const mockUser = createTestUser();
      const onLogout = vi.fn();
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
          user={mockUser}
          onLogout={onLogout}
        >
          <div>Content</div>
        </Layout>
      );

      const logoutButton = screen.getByTitle('ログアウト');
      expect(logoutButton).toBeInTheDocument();
    });

    it('ログアウトボタンをクリックするとonLogoutが呼ばれる', () => {
      const mockUser = createTestUser();
      const onLogout = vi.fn();
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
          user={mockUser}
          onLogout={onLogout}
        >
          <div>Content</div>
        </Layout>
      );

      const logoutButton = screen.getByTitle('ログアウト');
      fireEvent.click(logoutButton);

      expect(onLogout).toHaveBeenCalled();
    });
  });

  describe('ヘッダー表示', () => {
    it('選択中の事業所名がヘッダーに表示される', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
        >
          <div>Content</div>
        </Layout>
      );

      const header = screen.getByRole('banner');
      expect(header).toHaveTextContent('訪問介護事業所A');
    });

    it('訪問介護事業所の場合、ヘッダーに訪問介護バッジが表示される', () => {
      render(
        <Layout
          activeTab="staff_list"
          setActiveTab={setActiveTab}
          offices={mockOffices}
          selectedOfficeId="office-001"
          setSelectedOfficeId={setSelectedOfficeId}
          periodConfig={defaultPeriodConfig}
        >
          <div>Content</div>
        </Layout>
      );

      const header = screen.getByRole('banner');
      expect(header).toHaveTextContent('訪問介護');
    });
  });
});
