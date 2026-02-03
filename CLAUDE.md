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

App.tsxで全状態を管理し、Firebase Firestoreに永続化。評価データは `{periodId}_{staffId}` 形式の複合キーで管理。

**データ永続化:**
- 認証状態: `contexts/AuthContext.tsx`
- データ管理: `hooks/useFirestoreData.ts`
- 初回起動時にLocalStorage（キー: `carepay_v2_state`）からFirestoreへ自動移行

**useFirestoreData.tsの実装パターン（重要）:**

複数の設定（smarthrConfig, departmentMappings, qualificationMappings, selectedPeriodId）は`saveConfigData()`で一括保存される。`useCallback`のclosure問題を回避するため、**useRef**で最新のステート値を保持する。

```typescript
// ステート定義の直後にRefを定義
const smarthrConfigRef = useRef(smarthrConfig);
const departmentMappingsRef = useRef(departmentMappings);
// ...

// useEffectでRefを同期
useEffect(() => {
  smarthrConfigRef.current = smarthrConfig;
}, [smarthrConfig]);

// セッター関数内でRefを参照（古いclosureを回避）
const setSmarthrConfig = useCallback((value) => {
  setSmarthrConfigState(prev => {
    const newValue = typeof value === 'function' ? value(prev) : value;
    smarthrConfigRef.current = newValue;
    // 他の設定はRefから最新値を取得
    saveConfigData(newValue, departmentMappingsRef.current, ...).catch(console.error);
    return newValue;
  });
}, [saveConfigData]);
```

**注意:** `applyData()`（Firestore初期読み込み時）でもRefを更新すること。そうしないと、読み込み直後のセッター呼び出しで古い初期値が使われてしまう。

### Key Components

- **Layout**: サイドバー・ヘッダーレイアウト（グループ化メニュー、事業所選択、全事業所オプション含む）
- **StaffInput**: 職員評価入力テーブル（給与計算ロジック内包）
- **StaffDashboard**: 職員個別ダッシュボード（履歴タイムライン表示）
- **MasterManager**: マスタデータ管理（評価期間の2行ヘッダーテーブル含む）
- **StaffManager**: 職員名簿管理（給与管理ボタン、社員番号列、基本給更新日列含む）
- **StaffAnalytics**: 職員分析BI（グラフ・テーブルで推移を可視化、全事業所対応）
- **HistoryView**: 評価履歴・変更ログ表示
- **LoginPage**: Googleログイン画面
- **UserManagement**: ユーザー・権限管理（事業所別権限設定対応）
- **BaseSalaryHistoryEditor**: 基本給改定履歴管理モーダル

### Salary Calculation Logic (`StaffInput.tsx:31-74`)

```
最終支給額 = 基本給 + 資格手当(最優先1つ) - 勤怠控除合計 + 業績評価合計
差分 = 旧給与 - 最終支給額
```

### AI Integration (`services/geminiService.ts`)

Gemini APIで給与データの傾向分析を実行。

### Styling

Tailwind CSS（CDN経由）+ カスタムフォント（Inter, Noto Sans JP）

### カラースキーム

| 用途 | カラーコード | 説明 |
|-----|------------|------|
| プライマリ | `#00c4cc` | ヘッダー、メニュー選択、SmartHR同期、CSV出力 |
| セカンダリ | `#26519f` | 資格バッジ、給与管理ボタン |
| サイドバー背景 | `white` | 白背景 |
| テキスト | `slate-600` | メニュー項目 |
| 区切り線 | `slate-200` | グループ間の境界 |

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
1. SmartHR APIから全従業員・部署一覧・カスタム項目テンプレートを並列取得
2. 部署名→部署IDのマッピングを作成（名前とフルパスの両方で引けるように）
3. 雇用形態フィルタで対象を絞り込み（デフォルト: 正社員のみ）
4. 部署→事業所マッピングで振り分け（部署IDベースでマッチング）
5. カスタム項目→資格マッピングで資格を紐付け
   - 「資格①」〜「資格⑧」カスタム項目は自動マッピング（名前照合）
6. 既存職員はemp_code/crewIdで照合して更新
7. 新規職員は追加（基本給はデフォルト値¥200,000）
8. マッピング未設定の従業員はスキップ（理由表示）
9. 退職・雇用形態変更は「ステータス変更」タブで別途表示
```

### 部署→事業所マッピングの仕組み

マスタ管理画面で事業所にSmartHR部署を紐づけると、`Office.smarthrDepartmentId`に**部署ID（UUID）**が保存される。

**重要な実装詳細:**
- SmartHR従業員APIから返る`department`フィールドは**文字列（フルパス）**形式（例: `"第2ケアサービス本部/鹿児島Bブロック/訪問介護（鴨池）"`）
- 一方、事業所には**部署ID（UUID）**が保存されている（例: `"5e47444b-5515-4c3c-8647-c068ce8773ba"`）
- この不一致を解決するため、同期時にSmartHR部署一覧APIを呼び出し、**部署名→部署ID**のマッピングを作成
- 従業員の部署名からIDを引き、そのIDで事業所の`smarthrDepartmentId`とマッチング

```typescript
// SmartHRSyncDialog.tsx - 部署名→IDマップ作成
const deptNameToIdMap: Record<string, string> = {};
for (const dept of departments) {
  deptNameToIdMap[dept.name] = dept.id;           // 名前でも引ける
  deptNameToIdMap[dept.full_path_name] = dept.id; // フルパスでも引ける
}

// smarthrService.ts - マッチング処理
const deptIdFromName = deptNameToIdMap[normalizedDept.name];
const matchedOffice = offices.find(o => o.smarthrDepartmentId === deptIdFromName);
```

**注意:** 部署名とIDの対応関係が変わった場合（SmartHR側で部署を削除・再作成など）、マスタ管理画面で事業所の紐づけをやり直す必要がある。

### 雇用形態フィルタ

同期ダイアログで同期対象の雇用形態を選択できる。

**UI仕様:**
- 「正社員」がデフォルトで選択済み
- 説明文:「正社員以外の雇用形態も同期する場合は、追加で選択してください。」
- 複数選択可能（例: 正社員 + パート）
- 全て未選択の場合は全従業員が対象（警告表示）

**実装:**
```typescript
// SmartHRSyncDialog.tsx - 雇用形態取得後に正社員を自動選択
const types = await service.getEmploymentTypes();
if (config.employmentTypeFilter.length === 0) {
  const seishain = types.find(t => t.name === '正社員');
  if (seishain) {
    setSelectedEmploymentTypes([seishain.id]);
  }
}
```

### 資格の自動マッピング

SmartHRのカスタム項目「資格①」〜「資格⑧」（プルダウン形式）から資格を自動マッピング。

**仕組み:**
1. マスタ管理画面でSmartHRの資格選択肢をプルダウンで選択
2. 選択すると`physical_name`（英語コード）が`smarthrCode`に保存される
3. 同期時に従業員データの資格値と`smarthrCode`を照合してマッチング

**重要なフィールド:**
- `physical_name`: SmartHRカスタム項目の選択肢の英語コード（例: `certified_care_worker`）
- `name`: 日本語名（例: `介護福祉士`）

```typescript
// services/smarthrService.ts - 資格フィールド判定
const isQualificationNameField = (name: string): boolean => {
  if (!name.startsWith('資格')) return false;
  // 証憑、取得日、満了日、更新日などは除外
  if (name.includes('証憑') || name.includes('取得日') || name.includes('満了日') || name.includes('更新')) return false;
  return true;
};

// マッチング: smarthrCodeまたはnameで照合
const matchingQual = businessTypeQualMasters.find(q =>
  q.name === qualName ||
  q.name === qualId ||
  q.smarthrCode === qualId ||
  q.smarthrCode === qualName
);
```

**QualificationMaster型の拡張:**
```typescript
interface QualificationMaster {
  id: string;
  name: string;
  allowance: number;
  priority: number;
  smarthrCode?: string;  // SmartHR連携用コード（physical_name）
}
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

---

## GWS認証 + 権限管理（2026-02-01 実装、2026-02-03 更新）

### 概要

Google Workspaceアカウントでログインし、管理者/一般ユーザーの2段階権限 + 事業所ごとの細かなアクセス制御を行う。

### 認証方式

Firebase Authentication（Googleプロバイダー）を使用。ホワイトリスト方式で、事前登録されたユーザーのみログイン可能。

### 権限レベル

| 権限 | マスタ管理 | 評価入力 | 閲覧 | SmartHR連携 | ユーザー管理 | 全事業所表示 |
|-----|----------|---------|-----|------------|------------|------------|
| admin（管理者） | ○ | ○ | ○ | ○ | ○ | ○ |
| user（一般） | × | 事業所別 | 事業所別 | × | × | × |

### 事業所別権限（一般ユーザー向け）

一般ユーザーは事業所ごとに「編集」「閲覧」「アクセス不可」を設定可能。

| 権限レベル | 評価入力 | 閲覧 |
|-----------|---------|-----|
| edit（編集） | ○ | ○ |
| view（閲覧） | × | ○ |
| なし | × | × |

### データ構造

```typescript
// types.ts
type UserRole = 'admin' | 'user';
type OfficePermissionLevel = 'edit' | 'view';

interface OfficePermission {
  officeId: string;
  permission: OfficePermissionLevel;
}

interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;
  officePermissions?: OfficePermission[];  // 事業所別権限
  allowedOfficeIds?: string[];             // 後方互換用
}
```

### 権限判定関数（AuthContext）

```typescript
// 事業所へのアクセス可否
canAccessOffice(officeId: string): boolean

// 事業所の編集権限
canEditOffice(officeId: string): boolean

// 事業所の閲覧権限
canViewOffice(officeId: string): boolean

// 事業所の権限レベル取得
getOfficePermission(officeId: string): 'edit' | 'view' | null
```

### 関連ファイル

| ファイル | 役割 |
|---------|------|
| `firebase.ts` | Firebase初期化（Auth + Firestore） |
| `services/firestoreService.ts` | Firestore CRUD操作 |
| `contexts/AuthContext.tsx` | 認証状態管理、ホワイトリスト検証 |
| `hooks/useAuth.ts` | 認証フック（re-export） |
| `hooks/useFirestoreData.ts` | Firestoreデータ取得・保存フック |
| `components/LoginPage.tsx` | Googleログイン画面 |
| `components/UserManagement.tsx` | ユーザー管理画面（管理者用） |

### Firestoreコレクション

| コレクション | 内容 |
|-------------|------|
| `users` | ユーザー・権限情報 |
| `offices` | 事業所情報 |
| `staff` | 職員名簿 |
| `masters` | マスタデータ（資格、勤怠条件、評価項目、期間） |
| `evaluationRecords` | 評価レコード |
| `inputs` | 評価入力データ |
| `history` | 評価履歴 |
| `changeLog` | 変更ログ |
| `config` | SmartHR設定、マッピング、選択中の期間 |

### 初期管理者の設定

環境変数`VITE_INITIAL_ADMIN_EMAIL`で指定したメールアドレスが最初にログインすると、自動的に管理者として登録される。

### LocalStorage → Firestore移行

初回ログイン時、LocalStorageにデータがあればFirestoreに自動移行。移行後は`carepay_v2_state_migrated`フラグが立つ。

---

## 基本給改定履歴管理（2026-02-01 実装）

### 概要

「○月から基本給変更」という形で、職員ごとに基本給の改定履歴を管理。評価期間に応じて適切な基本給が自動適用される。

### データ構造

```typescript
// types.ts
interface BaseSalaryRevision {
  id: string;              // UUID
  effectiveMonth: string;  // "YYYY-MM" 形式（例："2024-04"）
  amount: number;          // 基本給額
  memo?: string;           // 変更理由メモ（任意）
  createdAt: string;       // 作成日時
}

// Staff型の拡張
interface Staff {
  // ...既存フィールド
  baseSalary: number;                      // 最新の基本給（後方互換用）
  baseSalaryHistory?: BaseSalaryRevision[]; // 改定履歴配列
}
```

### 基本給取得ロジック（`utils/salaryUtils.ts`）

```typescript
// 評価期間に適用される基本給を取得
function getEffectiveBaseSalary(staff: Staff, evaluationStart: string): number
// effectiveMonth <= evaluationStart の中で最新のものを使用
// 同一月に複数の改定がある場合、createdAtが最新のものが有効
```

### 関連ファイル

| ファイル | 役割 |
|---------|------|
| `utils/salaryUtils.ts` | 基本給取得・操作ヘルパー関数 |
| `components/BaseSalaryHistoryEditor.tsx` | 給与管理モーダル |
| `components/StaffManager.tsx` | 給与管理ボタン、社員番号列 |

### 既存データ移行

baseSalaryHistoryがない職員には、初期履歴が自動作成される:
```typescript
{
  effectiveMonth: staff.enteredAt || "2000-01",
  amount: staff.baseSalary,
  memo: "初期移行データ"
}
```

---

## 評価履歴の変更ログ（2026-02-01 実装）

### 概要

評価を保存した際に、前回との差分を「職員〇〇 項目名 旧値→新値」形式で記録。

### データ構造

```typescript
// types.ts
interface ChangeLogEntry {
  id: string;
  timestamp: string;
  userId: string;           // 変更したユーザー
  userName: string;
  periodId: string;
  periodName: string;
  changes: ChangeDetail[];
}

interface ChangeDetail {
  staffId: string;
  staffName: string;
  field: string;            // "attendance_xxx" | "performance_xxx"
  fieldName: string;        // "欠勤" | "訪問件数" など
  oldValue: number | string;
  newValue: number | string;
}
```

### 関連ファイル

| ファイル | 役割 |
|---------|------|
| `components/HistoryView.tsx` | 評価履歴タブ + 変更ログタブ |
| `App.tsx` | 変更ログ生成ロジック（`generateChangeLog`関数） |

---

## 職員分析BI（2026-02-01 実装、2026-02-03 更新）

### 概要

職員ごとの給与・評価の推移を可視化する分析画面。管理者は全事業所の職員を横断的に分析可能。

### 表示内容

1. **職員選択**: 職員プルダウン（トップレベルの事業所選択に連動）
2. **基本給の推移**: 改定履歴を折れ線グラフで表示
3. **最終支給額の推移**: 期間ごとの支給額を折れ線グラフで表示
4. **給与内訳の推移**: 基本給・資格手当・控除・加算を積み上げ棒グラフで表示
5. **評価項目の推移**: 勤怠控除・業績評価をテーブルで表示
6. **期間別サマリー**: 全項目をテーブルで一覧表示

### 全事業所表示（管理者専用）

管理者がサイドバーで「📊 全事業所」を選択すると、全事業所の職員を一覧表示。職員選択プルダウンに事業所名カラムが追加される。

### 使用ライブラリ

- `chart.js` - グラフ描画ライブラリ
- `react-chartjs-2` - Reactラッパー

### 関連ファイル

| ファイル | 役割 |
|---------|------|
| `components/StaffAnalytics.tsx` | 職員分析BIメイン画面 |
| `components/SalaryChart.tsx` | 基本給・支給額・内訳グラフ |
| `components/EvaluationTable.tsx` | 評価項目推移テーブル |

---

## CSV出力機能（2026-02-03 実装）

### 概要

評価期間を選択して、給与計算結果をCSVファイルとしてエクスポートする機能。

### 出力項目

| 項目名 | 説明 |
|-------|------|
| 職員名 | 職員の氏名 |
| 基本給与 | 評価期間に適用される基本給 |
| 資格手当 | 最優先資格の手当額 |
| 正規給与 | 基本給与 + 資格手当 |
| 減額合計 | 勤怠控除の合計額 |
| 評価合計 | 業績評価の合計額 |
| 特別加減算 | 特別加減算額 |
| 最終支給額 | 正規給与 - 減額合計 + 評価合計 + 特別加減算 |
| 旧給与 | 前期間の支給額 |
| 差分 | 最終支給額 - 旧給与 |

### 使用方法

1. 「CSV出力」タブを選択
2. エクスポートする評価期間をプルダウンで選択
3. 「CSVダウンロード」ボタンをクリック
4. UTF-8（BOM付き）形式でダウンロード（Excel互換）

### 実装詳細

```typescript
// App.tsx - CSV生成
const generateCSV = () => {
  const BOM = '\uFEFF';  // Excel UTF-8対応
  const headers = ['職員名', '基本給与', '資格手当', ...];
  // 給与計算ロジックを適用してデータ生成
};
```

---

## 職員名簿の追加機能（2026-02-03 実装）

### 基本給更新日カラム

職員名簿テーブルに「基本給更新日」カラムを追加。基本給改定履歴の中で最も新しい`createdAt`を日時形式で表示。

```typescript
// StaffManager.tsx
const latestEntry = [...history].sort((a, b) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
)[0];
```

---

## 評価期間管理UIの改善（2026-02-03 実装）

### 概要

マスタ管理の評価期間テーブルを2行ヘッダー構造に変更し、評価対象期間と支払対象期間を視覚的に区別。

### テーブル構造

```
| 期間名 | 評価対象期間      | 支払対象期間      | ステータス | 操作 |
|       | 開始    | 終了    | 開始    | 終了    |           |     |
```

### スタイリング

- 評価対象期間: スレートグレーのバッジ
- 支払対象期間: インディゴのバッジ

---

## 環境変数

`.env.local`に以下を設定:

```bash
# Firebase設定
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=visit-care-salary.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=visit-care-salary
VITE_FIREBASE_STORAGE_BUCKET=visit-care-salary.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# 初期管理者メールアドレス
VITE_INITIAL_ADMIN_EMAIL=admin@example.com

# Gemini API（AI分析用）
GEMINI_API_KEY=your-gemini-api-key
```

---

## 実装ステータス（2026-02-03 更新）

### ✅ 完了済み

#### Firebase Console設定
- [x] Firebase Console（visit-care-salary）でAuthentication有効化
- [x] Googleプロバイダー設定済み
- [x] Firestoreデータベース作成済み
- [x] Firestoreセキュリティルール（`firestore.rules`）デプロイ済み

#### 環境変数設定
- [x] `.env.local`ファイル作成
- [x] Firebase SDK設定値を設定
- [x] 初期管理者メール設定（`VITE_INITIAL_ADMIN_EMAIL`）

#### 動作確認
- [x] Googleログイン動作確認
- [x] 初期管理者としてログイン成功
- [x] 権限に応じたタブ表示確認

#### 2026-02-03 追加機能
- [x] 権限システムの簡素化（admin/userの2段階）
- [x] 事業所別権限設定（edit/view/none）
- [x] 管理者向け「全事業所」表示オプション
- [x] CSV出力機能（評価期間選択、給与計算結果エクスポート）
- [x] 職員名簿に「基本給更新日」カラム追加
- [x] 評価期間管理UIの改善（2行ヘッダー構造）

#### 2026-02-03 UI/UXリニューアル
- [x] システム名変更: 「CarePay Manager」→「訪問系評価登録システム」
- [x] メニューバーのグループ化（評価管理/データ管理/システム設定）
- [x] サイドバーを白背景に変更
- [x] ヘッダー背景色: `#00c4cc`（ターコイズ）
- [x] メニューグループヘッダー色: `#00c4cc`
- [x] 選択中メニュー・事業所ボタン: `#00c4cc`
- [x] SmartHR同期ボタン・CSVエクスポート: `#00c4cc`
- [x] 資格バッジ・給与管理ボタン: `#26519f`（ネイビー）
- [x] ロール表示を「管理者/一般」に簡素化
- [x] SmartHR同期の雇用形態初期値（正社員）修正

---

## TODO: 将来的な改善

### セキュリティ強化（推奨）

- [ ] Firestoreセキュリティルールの詳細設定（本番用ルールへの切り替え）
  - `firestore.rules`にコメントアウトされた本番用ルールあり
  - 権限ベースのアクセス制御を有効化

### 機能改善（任意）

- [ ] Cloud Functionsを使ったSmartHR API呼び出し（CORS回避）
- [x] ~~データエクスポート機能のCSV出力実装~~ → 2026-02-03完了
- [ ] 評価期間に応じた基本給自動適用（`getEffectiveBaseSalary`の統合）
- [ ] プッシュ通知（評価期間終了リマインダーなど）
- [ ] バックアップ・リストア機能
- [ ] Firebase Hostingへの本番デプロイ（`npm run build && firebase deploy --only hosting`）

---

## 既知の問題と修正履歴

### useCallbackとクロージャによるステート上書きバグ（2026-02-03 修正）

#### 問題

`useFirestoreData.ts`の複数のセッター関数（`setSmarthrConfig`, `setDepartmentMappings`, `setQualificationMappings`, `setSelectedPeriodId`）が、Firestoreに設定を保存する際に**クロージャでキャプチャした古いステート値**を使用していた。

#### 発生シナリオ

1. ユーザーがSmartHR設定を保存 → `setSmarthrConfig(newConfig)` が呼ばれる
2. Firestoreに `saveConfigData(newConfig, departmentMappings, qualificationMappings, selectedPeriodId)` が実行される
3. Reactのステート更新は**非同期**のため、他のセッター関数が持つ `smarthrConfig` はまだ古い値
4. 直後に `setSelectedPeriodId` が呼ばれると、古い `smarthrConfig`（空の値）でFirestoreを上書き
5. 結果：SmartHR設定が消える

#### 問題のあったコード

```typescript
// 各セッターがクロージャで古い値をキャプチャ
const setSmarthrConfig = useCallback((value) => {
  saveConfigData(newValue, departmentMappings, qualificationMappings, selectedPeriodId);
}, [departmentMappings, qualificationMappings, selectedPeriodId]);

const setSelectedPeriodId = useCallback((value) => {
  saveConfigData(smarthrConfig, departmentMappings, qualificationMappings, value);
  // ↑ smarthrConfig は古い値（空）の可能性あり
}, [smarthrConfig, departmentMappings, qualificationMappings]);
```

#### 修正方法

`useRef`を使用して常に最新のステート値を参照するように変更。

```typescript
// refで最新の値を保持
const smarthrConfigRef = useRef(smarthrConfig);
useEffect(() => {
  smarthrConfigRef.current = smarthrConfig;
}, [smarthrConfig]);

const setSmarthrConfig = useCallback((value) => {
  smarthrConfigRef.current = newValue;  // 同期的に更新
  saveConfigData(newValue, departmentMappingsRef.current, qualificationMappingsRef.current, selectedPeriodIdRef.current);
}, [saveConfigData]);

const setSelectedPeriodId = useCallback((value) => {
  saveConfigData(smarthrConfigRef.current, ...);  // 常に最新の値を参照
}, [saveConfigData]);
```

#### 教訓

- **複数のステートを一緒にFirestoreに保存する場合**、`useCallback`の依存配列に他のステートを含めると、古い値で上書きされる危険がある
- **`useRef`を使用**して最新の値を同期的に参照することで、競合状態を防げる
- 特に設定データなど、複数のフィールドを1つのドキュメントにまとめて保存する場合は注意が必要
