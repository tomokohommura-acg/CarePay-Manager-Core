/**
 * E2Eテスト: デモモード
 *
 * 実行方法:
 * npx playwright test tests/e2e/demo-mode.spec.ts
 *
 * 事前準備:
 * npm install -D @playwright/test
 * npx playwright install
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const DEMO_URL = `${BASE_URL}?demo=true`;

test.describe('デモモード', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO_URL);
    // デモモードのロードを待つ
    await page.waitForSelector('text=訪問系評価登録システム');
  });

  test.describe('初期表示', () => {
    test('デモモードバナーが表示される', async ({ page }) => {
      await expect(page.locator('text=デモモード')).toBeVisible();
    });

    test('アプリタイトルが表示される', async ({ page }) => {
      await expect(page.locator('text=訪問系評価登録システム')).toBeVisible();
    });

    test('訪問介護タブがデフォルト選択される', async ({ page }) => {
      const select = page.locator('select');
      await expect(select).toHaveValue('HOME_CARE');
    });

    test('デモ事業所Aがデフォルト選択される', async ({ page }) => {
      await expect(page.locator('text=訪問介護（デモ事業所A）')).toBeVisible();
    });

    test('デモユーザーとして管理者権限でログインされる', async ({ page }) => {
      await expect(page.locator('text=デモユーザー')).toBeVisible();
      await expect(page.locator('text=管理者')).toBeVisible();
    });
  });

  test.describe('メニュー遷移', () => {
    test('職員名簿タブに遷移できる', async ({ page }) => {
      await page.click('text=職員名簿');
      await expect(page.locator('text=職員名簿・基本給管理')).toBeVisible();
    });

    test('評価データ入力簿タブに遷移できる', async ({ page }) => {
      await page.click('text=評価データ入力簿');
      await expect(page.locator('text=評価入力')).toBeVisible();
    });

    test('評価履歴タブに遷移できる', async ({ page }) => {
      await page.click('text=評価履歴');
      await expect(page.locator('text=評価履歴')).toBeVisible();
    });

    test('職員分析タブに遷移できる', async ({ page }) => {
      await page.click('text=職員分析');
      await expect(page.locator('text=職員を選択してください')).toBeVisible();
    });

    test('CSV出力タブに遷移できる', async ({ page }) => {
      await page.click('text=CSV出力');
      await expect(page.locator('text=CSVダウンロード')).toBeVisible();
    });

    test('マスタ管理タブに遷移できる（管理者）', async ({ page }) => {
      await page.click('text=マスタ管理');
      await expect(page.locator('text=資格マスタ')).toBeVisible();
    });

    test('SmartHR連携タブに遷移できる（管理者）', async ({ page }) => {
      await page.click('text=SmartHR連携');
      await expect(page.locator('text=SmartHR API連携設定')).toBeVisible();
    });

    test('ユーザー管理タブに遷移できる（管理者）', async ({ page }) => {
      await page.click('text=ユーザー管理');
      await expect(page.locator('text=ユーザー管理')).toBeVisible();
    });
  });

  test.describe('事業所切り替え', () => {
    test('業態カテゴリを訪問看護に切り替えられる', async ({ page }) => {
      const select = page.locator('select').first();
      await select.selectOption('HOME_NURSING');
      await expect(page.locator('text=訪問看護（デモ事業所B）')).toBeVisible();
    });

    test('事業所を切り替えるとヘッダーが更新される', async ({ page }) => {
      const select = page.locator('select').first();
      await select.selectOption('HOME_NURSING');
      await page.click('text=訪問看護（デモ事業所B）');

      // ヘッダーに事業所名が表示される
      const header = page.locator('header');
      await expect(header).toContainText('訪問看護（デモ事業所B）');
    });
  });

  test.describe('全事業所表示', () => {
    test('全事業所ボタンが表示される', async ({ page }) => {
      await expect(page.locator('text=全事業所')).toBeVisible();
    });

    test('全事業所をクリックするとヘッダーが更新される', async ({ page }) => {
      await page.click('button:has-text("全事業所")');

      const header = page.locator('header');
      await expect(header).toContainText('全事業所表示');
    });

    test('全事業所モードで評価データ入力簿を開くと案内メッセージが表示される', async ({ page }) => {
      await page.click('button:has-text("全事業所")');
      await page.click('text=評価データ入力簿');

      await expect(page.locator('text=事業所を選択してください')).toBeVisible();
    });

    test('全事業所モードで職員分析を開くと全職員が選択可能', async ({ page }) => {
      await page.click('button:has-text("全事業所")');
      await page.click('text=職員分析');

      // 職員選択のプルダウンが表示される
      await expect(page.locator('text=職員を選択してください')).toBeVisible();
    });
  });

  test.describe('職員名簿CRUD', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('text=職員名簿');
    });

    test('職員一覧が表示される', async ({ page }) => {
      await expect(page.locator('text=山田 太郎')).toBeVisible();
      await expect(page.locator('text=佐藤 花子')).toBeVisible();
    });

    test('職員追加ボタンが表示される', async ({ page }) => {
      await expect(page.locator('button:has-text("職員を新規登録")')).toBeVisible();
    });

    test('職員を追加できる', async ({ page }) => {
      await page.click('button:has-text("職員を新規登録")');
      await expect(page.locator('text=新職員')).toBeVisible();
    });

    test('給与管理ボタンが表示される', async ({ page }) => {
      await expect(page.locator('button:has-text("給与管理")').first()).toBeVisible();
    });

    test('給与管理モーダルを開ける', async ({ page }) => {
      await page.click('button:has-text("給与管理")');
      await expect(page.locator('text=💰 給与管理')).toBeVisible();
    });

    test('職員削除の確認ダイアログが表示される', async ({ page }) => {
      await page.click('[title="削除"]');
      await expect(page.locator('text=職員を削除しますか？')).toBeVisible();
    });
  });

  test.describe('評価データ入力', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('text=評価データ入力簿');
    });

    test('評価テーブルが表示される', async ({ page }) => {
      await expect(page.locator('table')).toBeVisible();
    });

    test('職員名が表示される', async ({ page }) => {
      await expect(page.locator('text=山田 太郎')).toBeVisible();
    });

    test('勤怠入力フィールドが存在する', async ({ page }) => {
      // 数値入力フィールドが存在
      const numberInputs = page.locator('input[type="number"]');
      await expect(numberInputs.first()).toBeVisible();
    });
  });

  test.describe('職員分析', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('text=職員分析');
    });

    test('職員選択プルダウンが表示される', async ({ page }) => {
      await expect(page.locator('text=職員を選択してください')).toBeVisible();
    });

    test('職員を選択すると分析が表示される', async ({ page }) => {
      // 職員選択
      await page.locator('select').selectOption({ index: 1 });

      // グラフエリアが表示される
      await expect(page.locator('text=基本給の推移')).toBeVisible();
    });

    test('表示切り替えボタンが動作する', async ({ page }) => {
      await page.locator('select').selectOption({ index: 1 });

      // 表示切り替えボタンが表示される
      await expect(page.locator('button:has-text("📋")')).toBeVisible();
      await expect(page.locator('button:has-text("📊")')).toBeVisible();
      await expect(page.locator('button:has-text("📈")')).toBeVisible();
    });
  });

  test.describe('CSV出力', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('text=CSV出力');
    });

    test('評価期間選択プルダウンが表示される', async ({ page }) => {
      await expect(page.locator('select')).toBeVisible();
    });

    test('CSVダウンロードボタンが表示される', async ({ page }) => {
      await expect(page.locator('button:has-text("CSVダウンロード")')).toBeVisible();
    });
  });

  test.describe('マスタ管理', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('text=マスタ管理');
    });

    test('資格マスタタブが表示される', async ({ page }) => {
      await expect(page.locator('text=資格マスタ')).toBeVisible();
    });

    test('勤怠条件タブが表示される', async ({ page }) => {
      await expect(page.locator('text=勤怠条件')).toBeVisible();
    });

    test('業績評価タブが表示される', async ({ page }) => {
      await expect(page.locator('text=業績評価')).toBeVisible();
    });

    test('評価期間タブが表示される', async ({ page }) => {
      await expect(page.locator('text=評価期間')).toBeVisible();
    });

    test('事業所設定が表示される', async ({ page }) => {
      await expect(page.locator('text=事業所設定')).toBeVisible();
    });
  });
});

test.describe('レスポンシブ', () => {
  test('モバイルサイズでも表示される', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(DEMO_URL);

    await expect(page.locator('text=訪問系評価登録システム')).toBeVisible();
  });
});
