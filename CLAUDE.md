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
