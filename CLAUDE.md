# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server on port 3000
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build locally
```

## Deployment

Firebase Hostingにデプロイ（プロジェクトID: `visit-care-salary`）:
```bash
npm run build
firebase deploy --only hosting
```

## Environment Variables

- `GEMINI_API_KEY`: Gemini API key for AI salary trend analysis (set in `.env.local`)

## Architecture

### Application Overview

訪問介護・訪問看護事業所向けの給与管理・人事評価システム。職員の基本給、資格手当、勤怠控除、業績評価を管理し、最終支給額を算出する。

### Core Data Model (`types.ts`)

- **BusinessType**: `HOME_CARE`(訪問介護) / `HOME_NURSING`(訪問看護) - 事業種別
- **Office**: 事業所情報（事業種別に紐づく）
- **MasterData**: 事業種別ごとの設定マスタ
  - `qualifications`: 資格手当マスタ（優先度で適用順位決定）
  - `attendanceConditions`: 勤怠控除条件マスタ
  - `performanceEvaluations`: 業績評価マスタ
  - `periods`: 評価期間マスタ（editing/lockedステータス）
- **Staff**: 職員基本情報
- **EvaluationRecord**: 評価期間ごとの職員スナップショット
- **StaffUpdateData**: 期間・職員ごとの入力データ（勤怠・業績）
- **HistoryEntry**: 評価確定時の履歴保存データ

### State Management

App.tsxで全状態を管理し、LocalStorageに永続化（キー: `carepay_v2_state`）。評価データは `{periodId}_{staffId}` 形式の複合キーで管理。

### Key Components

- **StaffInput**: 職員評価入力テーブル（給与計算ロジック内包）
- **StaffDashboard**: 職員個別ダッシュボード（履歴タイムライン表示）
- **MasterManager**: マスタデータ管理
- **StaffManager**: 職員名簿管理

### Salary Calculation Logic (`StaffInput.tsx:31-74`)

```
最終支給額 = 基本給 + 資格手当(最優先1つ) - 勤怠控除合計 + 業績評価合計
差分 = 旧給与 - 最終支給額
```

### AI Integration (`services/geminiService.ts`)

Gemini APIで給与データの傾向分析を実行。

### Styling

Tailwind CSS（CDN経由）+ カスタムフォント（Inter, Noto Sans JP）

---

## SmartHR API連携

### 概要

SmartHRから従業員データを取得し、職員名簿に自動同期する機能。部署→事業所、カスタム項目→資格のマッピングにより、手動入力の手間を削減。

### 関連ファイル

| ファイル | 役割 |
|---------|------|
| `types/smarthr.ts` | SmartHR APIレスポンス型定義 |
| `services/smarthrService.ts` | API呼び出し、データ変換、同期処理 |
| `components/SmartHRSettings.tsx` | 接続設定・マッピング設定UI |
| `components/QualificationMapping.tsx` | 資格マッピング設定UI |
| `components/SmartHRSyncDialog.tsx` | 同期プレビュー・実行ダイアログ |

### データモデル（`types.ts`に追加）

```typescript
// SmartHR連携設定
interface SmartHRConfig {
  subdomain: string;           // SmartHRサブドメイン
  accessToken: string;         // APIトークン（難読化して保存）
  employmentTypeFilter: string[]; // 同期対象の雇用形態ID
  lastSyncedAt: string | null;
  storeToken: boolean;
}

// 部署→事業所マッピング
interface DepartmentOfficeMapping {
  smarthrDepartmentId: string;
  smarthrDepartmentName: string;
  officeId: string;
}

// カスタム項目→資格マッピング
interface QualificationMapping {
  id: string;
  smarthrFieldId: string;
  smarthrFieldName: string;
  smarthrValueId: string | null;
  smarthrValueName: string | null;
  qualificationId: string;
  businessType: BusinessType;
}

// Staff型の拡張フィールド
interface Staff {
  // ...既存フィールド
  enteredAt?: string;        // 入社日
  resignedAt?: string;       // 退職日
  smarthrEmpCode?: string;   // SmartHR社員番号
  smarthrCrewId?: string;    // SmartHR従業員ID
  smarthrSyncedAt?: string;  // 最終同期日時
}

// Office型の拡張フィールド
interface Office {
  // ...既存フィールド
  smarthrDepartmentId?: string; // 紐付けSmartHR部署ID
}
```

### 同期フロー

```
1. SmartHR APIから全従業員を取得（ページネーション対応）
2. 雇用形態フィルタで対象を絞り込み（デフォルト: 正社員のみ）
3. 部署→事業所マッピングで振り分け
4. カスタム項目→資格マッピングで資格を紐付け
   - 「資格①」〜「資格⑧」カスタム項目は自動マッピング（名前照合）
5. 既存職員はemp_code/crewIdで照合して更新
6. 新規職員は追加（基本給はデフォルト値¥200,000）
7. マッピング未設定の従業員はスキップ（理由表示）
8. 退職・雇用形態変更は「ステータス変更」タブで別途表示
```

### 資格の自動マッピング

SmartHRのカスタム項目「資格①」〜「資格⑧」（プルダウン形式）は、選択された値の名前と資格マスタの名前を自動照合してマッピングする。手動マッピング設定は不要。

```typescript
// services/smarthrService.ts
const qualificationFieldPattern = /^資格[①②③④⑤⑥⑦⑧]$/;
// パターンに一致するカスタム項目の値を資格マスタ名と照合
```

### 退職・雇用形態変更の処理

同期時に以下のステータス変更を検出し、「ステータス変更」タブに表示:
- **退職**: SmartHRで退職日が設定された既存職員
- **雇用形態変更**: 同期対象外の雇用形態に変更された既存職員

履歴データは保持されるため、過去の評価記録は参照可能。

### 評価期間と退職者のフィルタリング

評価データ入力画面（StaffInput）では、評価期間開始日より前に退職した職員を自動的に除外:

```typescript
// App.tsx
if (staff?.resignedAt && evaluationStartDate) {
  const resignedDate = new Date(staff.resignedAt);
  if (resignedDate < evaluationStartDate) return false;
}
```

### セキュリティ

- APIトークンはBase64+XOR難読化してLocalStorageに保存
- 「トークンを保存しない」オプションあり（メモリ保持のみ）
- 難読化関数: `obfuscateToken()` / `deobfuscateToken()`（`smarthrService.ts`）

### 使用するSmartHR APIエンドポイント

| エンドポイント | 用途 |
|---------------|------|
| `GET /api/v1/crews` | 従業員一覧取得 |
| `GET /api/v1/departments` | 部署一覧取得 |
| `GET /api/v1/employment_types` | 雇用形態一覧取得 |
| `GET /api/v1/crew_custom_field_templates` | カスタム項目テンプレート取得 |

### エラーハンドリング

| HTTPステータス | メッセージ |
|---------------|----------|
| 401 | アクセストークンが無効です |
| 403 | APIへのアクセス権限がありません |
| 429 | API呼び出し回数制限に達しました |
| ネットワークエラー | インターネット接続を確認してください |

### 部署名変更の自動検出

マスタ管理画面を開くと、SmartHRから部署情報を自動取得し、紐付け済み事業所の名前と比較。差分があれば確認ダイアログを表示し、ユーザー承認後に事業所名を一括更新。

### 設定手順

1. SmartHR管理画面で[APIアクセストークンを発行](https://support.smarthr.jp/ja/help/articles/360026266033/)
2. 本アプリの「SmartHR連携」画面でサブドメイン・トークンを入力
3. 「接続テスト」で疎通確認
4. 「部署マッピング」タブでSmartHR部署→事業所を設定
5. 「資格マッピング」タブでカスタム項目→資格を設定
6. 職員名簿の「SmartHRから同期」ボタンで同期実行

### 基本給未設定職員の管理

SmartHR同期で新規追加された職員は基本給がデフォルト値（¥200,000）のため、個別設定が必要。

**運用フロー:**
1. 同期完了後、新規追加がある場合は「基本給を設定する」ボタンが表示される
2. クリックで職員名簿画面に遷移（未設定フィルターON）
3. 基本給未設定の職員のみ表示され、件数がバナーで確認可能
4. 各職員の基本給を入力
5. 「全員を表示」で通常表示に戻す

**関連コード:**
```typescript
// components/StaffManager.tsx
const DEFAULT_BASE_SALARY = 200000;
const unconfiguredCount = allOfficeStaff.filter(s => s.baseSalary === DEFAULT_BASE_SALARY).length;
```

### 注意事項

- 基本給はSmartHRから取得不可（手動入力または既存値を維持）
- カスタム項目の閲覧権限をトークンに付与する必要あり
- CORS制約によりブラウザから直接APIを叩く（将来的にCloud Functions経由を検討）
- ページネーション対応: 部署・雇用形態・カスタム項目テンプレートは100件/ページで全件取得
