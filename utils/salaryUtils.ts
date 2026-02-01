import { Staff, BaseSalaryRevision } from '../types';

/**
 * 評価期間に適用される基本給を取得する
 *
 * ロジック:
 * - effectiveMonth <= evaluationStart の中で最新（effectiveMonthdで降順ソートして先頭）のものを使用
 * - 同一月に複数の改定がある場合、createdAtが最新のものが有効
 * - 該当する履歴がない場合は、staff.baseSalaryを返す（後方互換性）
 *
 * @param staff - 職員データ
 * @param evaluationStart - 評価期間開始月（"YYYY-MM"形式）
 * @returns 適用される基本給額
 */
export function getEffectiveBaseSalary(staff: Staff, evaluationStart: string): number {
  const history = staff.baseSalaryHistory;

  // 履歴がない場合は現在の基本給を返す（後方互換性）
  if (!history || history.length === 0) {
    return staff.baseSalary;
  }

  // effectiveMonth <= evaluationStart の改定を抽出
  const applicableRevisions = history.filter(rev => rev.effectiveMonth <= evaluationStart);

  if (applicableRevisions.length === 0) {
    // 適用可能な改定がない場合は現在の基本給を返す
    return staff.baseSalary;
  }

  // effectiveMonthで降順ソートし、同一月内ではcreatedAtで降順ソート
  const sorted = applicableRevisions.sort((a, b) => {
    // まずeffectiveMonthで比較（降順）
    if (a.effectiveMonth !== b.effectiveMonth) {
      return b.effectiveMonth.localeCompare(a.effectiveMonth);
    }
    // 同じeffectiveMonthならcreatedAtで比較（降順）
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return sorted[0].amount;
}

/**
 * 基本給改定履歴を追加する
 *
 * @param staff - 職員データ
 * @param revision - 追加する改定情報（idとcreatedAtは自動生成）
 * @returns 更新された職員データ
 */
export function addBaseSalaryRevision(
  staff: Staff,
  revision: Omit<BaseSalaryRevision, 'id' | 'createdAt'>
): Staff {
  const newRevision: BaseSalaryRevision = {
    ...revision,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };

  const history = staff.baseSalaryHistory || [];

  return {
    ...staff,
    baseSalaryHistory: [...history, newRevision],
    // baseSalaryも最新の改定額で更新（後方互換性のため）
    baseSalary: newRevision.amount
  };
}

/**
 * 基本給改定履歴を削除する
 *
 * @param staff - 職員データ
 * @param revisionId - 削除する改定のID
 * @returns 更新された職員データ
 */
export function removeBaseSalaryRevision(staff: Staff, revisionId: string): Staff {
  const history = staff.baseSalaryHistory || [];
  const newHistory = history.filter(rev => rev.id !== revisionId);

  // 残った履歴から最新の基本給を計算
  let latestBaseSalary = staff.baseSalary;
  if (newHistory.length > 0) {
    const sorted = [...newHistory].sort((a, b) => {
      if (a.effectiveMonth !== b.effectiveMonth) {
        return b.effectiveMonth.localeCompare(a.effectiveMonth);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    latestBaseSalary = sorted[0].amount;
  }

  return {
    ...staff,
    baseSalaryHistory: newHistory,
    baseSalary: latestBaseSalary
  };
}

/**
 * 基本給改定履歴を編集する
 *
 * @param staff - 職員データ
 * @param revisionId - 編集する改定のID
 * @param updates - 更新する内容
 * @returns 更新された職員データ
 */
export function updateBaseSalaryRevision(
  staff: Staff,
  revisionId: string,
  updates: Partial<Omit<BaseSalaryRevision, 'id' | 'createdAt'>>
): Staff {
  const history = staff.baseSalaryHistory || [];
  const newHistory = history.map(rev =>
    rev.id === revisionId ? { ...rev, ...updates } : rev
  );

  // 最新の基本給を再計算
  const sorted = [...newHistory].sort((a, b) => {
    if (a.effectiveMonth !== b.effectiveMonth) {
      return b.effectiveMonth.localeCompare(a.effectiveMonth);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const latestBaseSalary = sorted.length > 0 ? sorted[0].amount : staff.baseSalary;

  return {
    ...staff,
    baseSalaryHistory: newHistory,
    baseSalary: latestBaseSalary
  };
}

/**
 * 既存データを新形式に移行する（baseSalaryHistoryがない場合）
 *
 * @param staff - 職員データ
 * @returns 移行された職員データ
 */
export function migrateStaffBaseSalary(staff: Staff): Staff {
  // すでに履歴がある場合は何もしない
  if (staff.baseSalaryHistory && staff.baseSalaryHistory.length > 0) {
    return staff;
  }

  // 初期履歴を作成
  const initialRevision: BaseSalaryRevision = {
    id: crypto.randomUUID(),
    effectiveMonth: staff.enteredAt?.substring(0, 7) || '2000-01',
    amount: staff.baseSalary,
    memo: '初期移行データ',
    createdAt: new Date().toISOString()
  };

  return {
    ...staff,
    baseSalaryHistory: [initialRevision]
  };
}

/**
 * 履歴を適用月順にソートする（表示用）
 *
 * @param history - 基本給改定履歴配列
 * @returns ソートされた履歴配列（古い順）
 */
export function sortHistoryByEffectiveMonth(history: BaseSalaryRevision[]): BaseSalaryRevision[] {
  return [...history].sort((a, b) => {
    if (a.effectiveMonth !== b.effectiveMonth) {
      return a.effectiveMonth.localeCompare(b.effectiveMonth);
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * 月を "YYYY年MM月" 形式でフォーマット
 *
 * @param month - "YYYY-MM" 形式の月
 * @returns "YYYY年MM月" 形式の文字列
 */
export function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  return `${year}年${m}月`;
}
