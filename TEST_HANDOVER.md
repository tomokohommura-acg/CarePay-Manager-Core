# テスト実装 引継ぎドキュメント

**作成日**: 2026-02-04
**ステータス**: ユニットテスト150件 ALL PASS

---

## 現在の状態

### 完了済み

- [x] Vitest + React Testing Library環境構築
- [x] Firebaseモック実装
- [x] テストユーティリティ（ヘルパー関数）作成
- [x] 純粋関数テスト（salaryUtils, smarthrService, authPermissions）
- [x] デモデータ整合性テスト
- [x] コンポーネントテスト（Layout, StaffManager, BaseSalaryHistoryEditor）
- [x] CLAUDE.mdへのテストドキュメント追記
- [x] vite.config.tsでE2Eフォルダ除外設定

### テスト実行結果

```
npm run test:run

 ✓ tests/salaryUtils.test.ts (16 tests)
 ✓ tests/smarthrService.test.ts (18 tests)
 ✓ tests/authPermissions.test.ts (18 tests)
 ✓ tests/demoData.test.ts (31 tests)
 ✓ tests/components/Layout.test.tsx (26 tests)
 ✓ tests/components/StaffManager.test.tsx (22 tests)
 ✓ tests/components/BaseSalaryHistoryEditor.test.tsx (19 tests)

Test Files  7 passed (7)
     Tests  150 passed (150)
```

---

## ファイル構成

```
tests/
├── setup.ts                    # jest-domセットアップ
├── mocks/
│   └── firebase.ts             # Firebase/Firestoreモック
├── utils/
│   └── testUtils.tsx           # ヘルパー関数（createTestStaff等）
├── salaryUtils.test.ts         # 基本給ユーティリティ
├── smarthrService.test.ts      # SmartHR連携サービス
├── authPermissions.test.ts     # 権限判定ロジック
├── demoData.test.ts            # デモデータ整合性
├── components/
│   ├── Layout.test.tsx         # Layoutコンポーネント
│   ├── StaffManager.test.tsx   # StaffManagerコンポーネント
│   └── BaseSalaryHistoryEditor.test.tsx
└── e2e/
    └── demo-mode.spec.ts       # Playwright E2E（手動実行）
```

---

## 未実装（優先度順）

### 高優先度

1. **StaffInput.tsx のテスト**
   - 給与計算ロジックの中核
   - 基本給 + 資格手当 - 勤怠控除 + 業績評価の計算検証
   - 差分計算の正確性

2. **useFirestoreData.ts のテスト**
   - クロージャバグ（2026-02-03修正）の再発防止
   - 複数ステート同時更新の整合性
   - Firestore保存・読み込みの検証

### 中優先度

3. **MasterManager.tsx のテスト**
   - マスタCRUD操作
   - 評価期間のステータス管理

4. **SmartHRSyncDialog.tsx のテスト**
   - 同期プレビュー表示
   - 同期実行フロー

### 低優先度

5. **StaffAnalytics.tsx のテスト**
   - グラフ表示切り替え
   - データ集計ロジック

6. **E2Eテスト自動化**
   - `npm install -D @playwright/test`
   - `npx playwright install`
   - CI/CD統合

---

## テスト追加の手順

### 新しいコンポーネントテストを追加する場合

```typescript
// tests/components/NewComponent.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../utils/testUtils';
import { NewComponent } from '../../components/NewComponent';
import { createTestStaff, createTestMasterData } from '../utils/testUtils';

describe('NewComponent', () => {
  beforeEach(() => {
    // モック初期化
  });

  it('正常に表示される', () => {
    render(<NewComponent />);
    expect(screen.getByText('期待するテキスト')).toBeInTheDocument();
  });
});
```

### 新しい純粋関数テストを追加する場合

```typescript
// tests/newService.test.ts
import { describe, it, expect } from 'vitest';
import { targetFunction } from '../services/newService';

describe('targetFunction', () => {
  it('正常なケース', () => {
    const result = targetFunction(input);
    expect(result).toBe(expected);
  });
});
```

---

## 既知の問題

### 1. 複数要素のセレクション

コンポーネントテストで同じテキストが複数表示される場合、`getByText`ではなく`getAllByText`を使用：

```typescript
// NG: 複数要素でエラー
expect(screen.getByText('¥250,000')).toBeInTheDocument();

// OK: 配列で取得
const elements = screen.getAllByText('¥250,000');
expect(elements.length).toBeGreaterThanOrEqual(1);
```

### 2. サイドバー要素の特定

ヘッダーとサイドバーに同じテキストがある場合：

```typescript
// サイドバー内の要素を特定
const sidebar = document.querySelector('aside');
expect(sidebar?.textContent).toContain('対象テキスト');
```

---

## コマンドリファレンス

```bash
# ユニットテスト（watch mode）
npm run test

# ユニットテスト（1回実行）
npm run test:run

# E2Eテスト（Playwrightインストール後）
npm run test:e2e

# E2Eテスト（UI付き）
npm run test:e2e:ui
```

---

## 参照ドキュメント

- `CLAUDE.md` - テストセクション（詳細なテストケース一覧）
- `E2E_TEST_HANDOVER.md` - E2Eテスト手動実行結果
- `vite.config.ts` - Vitest設定
- `playwright.config.ts` - Playwright設定
