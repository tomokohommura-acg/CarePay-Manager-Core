import {
  SmartHRCrew,
  SmartHRCustomFieldTemplate,
  SmartHRCrewsResponse
} from '../types/smarthr';
import {
  Staff,
  Office,
  DepartmentOfficeMapping,
  QualificationMapping,
  SmartHRSyncPreview,
  SmartHRSyncItem,
  SmartHRSkippedItem,
  SmartHRStatusChangeItem,
  QualificationMaster,
  BusinessType
} from '../types';

// トークン難読化用（Base64 + XOR）
const OBFUSCATION_KEY = 'carepay_smarthr_2024';

export function obfuscateToken(token: string): string {
  const xored = token.split('').map((char, i) => {
    return String.fromCharCode(char.charCodeAt(0) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length));
  }).join('');
  return btoa(xored);
}

export function deobfuscateToken(obfuscated: string): string {
  try {
    const xored = atob(obfuscated);
    return xored.split('').map((char, i) => {
      return String.fromCharCode(char.charCodeAt(0) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length));
    }).join('');
  } catch {
    return '';
  }
}

export class SmartHRApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'SmartHRApiError';
  }
}

export class SmartHRService {
  private subdomain: string;
  private accessToken: string;

  constructor(subdomain: string, accessToken: string) {
    this.subdomain = subdomain;
    this.accessToken = accessToken;
  }

  private get baseUrl(): string {
    return `https://${this.subdomain}.smarthr.jp/api/v1`;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      switch (response.status) {
        case 401:
          throw new SmartHRApiError(401, 'アクセストークンが無効です');
        case 403:
          throw new SmartHRApiError(403, 'APIへのアクセス権限がありません');
        case 429:
          throw new SmartHRApiError(429, 'API呼び出し回数制限に達しました。しばらく待ってから再試行してください');
        case 404:
          throw new SmartHRApiError(404, 'リソースが見つかりません');
        default:
          throw new SmartHRApiError(response.status, `APIエラー: ${response.status}`);
      }
    }

    return response.json();
  }

  // 接続テスト
  async testConnection(): Promise<boolean> {
    try {
      await this.fetch('/crews?per_page=1');
      return true;
    } catch (error) {
      if (error instanceof SmartHRApiError) {
        throw error;
      }
      throw new SmartHRApiError(0, 'インターネット接続を確認してください');
    }
  }

  // 従業員一覧取得（ページネーション対応）
  async getAllCrews(): Promise<SmartHRCrew[]> {
    const allCrews: SmartHRCrew[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.fetch<SmartHRCrew[]>(
        `/crews?per_page=${perPage}&page=${page}`
      );

      if (!response || response.length === 0) {
        break;
      }

      allCrews.push(...response);

      if (response.length < perPage) {
        break;
      }

      page++;
    }

    return allCrews;
  }

  // カスタム項目テンプレート取得（ページネーション対応）
  async getCustomFieldTemplates(): Promise<SmartHRCustomFieldTemplate[]> {
    const allTemplates: SmartHRCustomFieldTemplate[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.fetch<SmartHRCustomFieldTemplate[]>(
        `/crew_custom_field_templates?per_page=${perPage}&page=${page}`
      );

      if (!response || response.length === 0) {
        break;
      }

      allTemplates.push(...response);

      if (response.length < perPage) {
        break;
      }

      page++;
    }

    return allTemplates;
  }

  // 雇用形態一覧取得（ページネーション対応）
  async getEmploymentTypes(): Promise<{ id: string; name: string }[]> {
    const allTypes: { id: string; name: string }[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.fetch<{ id: string; name: string }[]>(
        `/employment_types?per_page=${perPage}&page=${page}`
      );

      if (!response || response.length === 0) {
        break;
      }

      allTypes.push(...response);

      if (response.length < perPage) {
        break;
      }

      page++;
    }

    return allTypes;
  }

  // 部署一覧取得（ページネーション対応）
  async getDepartments(): Promise<{ id: string; name: string; full_path_name: string }[]> {
    const allDepartments: { id: string; name: string; full_path_name: string }[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.fetch<{ id: string; name: string; full_path_name: string }[]>(
        `/departments?per_page=${perPage}&page=${page}`
      );

      if (!response || response.length === 0) {
        break;
      }

      allDepartments.push(...response);

      if (response.length < perPage) {
        break;
      }

      page++;
    }

    return allDepartments;
  }
}

// データ変換関数
export function transformCrewToStaff(
  crew: SmartHRCrew,
  departmentMappings: DepartmentOfficeMapping[],
  qualificationMappings: QualificationMapping[],
  offices: Office[],
  qualificationMasters: Record<BusinessType, QualificationMaster[]>
): { staff: Partial<Staff> | null; officeId: string | null; skipped: boolean; error?: string } {
  // 部署→事業所のマッピングを検索
  let officeId: string | null = null;
  if (crew.department) {
    const mapping = departmentMappings.find(m => m.smarthrDepartmentId === crew.department!.id);
    if (mapping) {
      officeId = mapping.officeId;
    }
  }

  if (!officeId) {
    return {
      staff: null,
      officeId: null,
      skipped: true,
      error: crew.department
        ? `部署「${crew.department.name}」のマッピングが未設定`
        : '部署が未設定'
    };
  }

  // 事業所の業種を取得
  const office = offices.find(o => o.id === officeId);
  if (!office) {
    return { staff: null, officeId: null, skipped: true, error: 'マッピング先の事業所が存在しません' };
  }

  // カスタム項目から資格をマッピング
  const qualifications: string[] = [];
  const businessTypeQualMasters = qualificationMasters[office.type] || [];

  // 「資格①」〜「資格⑧」のパターン
  const qualificationFieldPattern = /^資格[①②③④⑤⑥⑦⑧]$/;

  for (const customField of crew.custom_fields) {
    // 「資格①」〜「資格⑧」のカスタム項目を自動処理
    if (qualificationFieldPattern.test(customField.template.name)) {
      if (customField.value && typeof customField.value === 'object' && customField.value.name) {
        // プルダウンの値（資格名）と資格マスタの名前を照合
        const qualName = customField.value.name;
        const matchingQual = businessTypeQualMasters.find(q => q.name === qualName);
        if (matchingQual && !qualifications.includes(matchingQual.id)) {
          qualifications.push(matchingQual.id);
        }
      }
      continue;
    }

    // 従来のマッピング処理（手動設定されたマッピング用）
    const matchingMappings = qualificationMappings.filter(m =>
      m.businessType === office.type &&
      m.smarthrFieldId === customField.template.id
    );

    for (const mapping of matchingMappings) {
      // 値のマッチングをチェック
      let matches = false;

      if (mapping.smarthrValueId === null) {
        // 値IDがnullの場合、フィールドに値があればマッチ
        matches = customField.value !== null && customField.value !== '';
      } else if (typeof customField.value === 'object' && customField.value !== null) {
        // enum型の場合
        matches = customField.value.id === mapping.smarthrValueId;
      } else if (typeof customField.value === 'string') {
        // string型の場合
        matches = customField.value === mapping.smarthrValueId;
      }

      if (matches) {
        // 資格マスタに存在するか確認
        const qualExists = businessTypeQualMasters.some(q => q.id === mapping.qualificationId);
        if (qualExists && !qualifications.includes(mapping.qualificationId)) {
          qualifications.push(mapping.qualificationId);
        }
      }
    }
  }

  const staff: Partial<Staff> = {
    name: `${crew.last_name} ${crew.first_name}`.trim(),
    qualifications,
    enteredAt: crew.entered_at || undefined,
    resignedAt: crew.resigned_at || undefined,
    smarthrEmpCode: crew.emp_code || undefined,
    smarthrCrewId: crew.id,
    smarthrSyncedAt: new Date().toISOString()
  };

  return { staff, officeId, skipped: false };
}

// 同期プレビュー生成
export function generateSyncPreview(
  crews: SmartHRCrew[],
  employmentTypeFilter: string[],
  departmentMappings: DepartmentOfficeMapping[],
  qualificationMappings: QualificationMapping[],
  offices: Office[],
  qualificationMasters: Record<BusinessType, QualificationMaster[]>,
  existingStaff: Staff[]
): SmartHRSyncPreview {
  const toAdd: SmartHRSyncItem[] = [];
  const toUpdate: SmartHRSyncItem[] = [];
  const statusChanges: SmartHRStatusChangeItem[] = [];
  const skipped: SmartHRSkippedItem[] = [];

  // 処理済みの既存職員IDを追跡
  const processedStaffIds = new Set<string>();

  for (const crew of crews) {
    // 既存職員との照合（最初に行う）
    const existingByCrewId = existingStaff.find(s => s.smarthrCrewId === crew.id);
    const existingByEmpCode = crew.emp_code
      ? existingStaff.find(s => s.smarthrEmpCode === crew.emp_code)
      : null;
    const existing = existingByCrewId || existingByEmpCode;

    if (existing) {
      processedStaffIds.add(existing.id);
    }

    // 雇用形態でフィルタ
    const isEmploymentTypeFiltered = employmentTypeFilter.length > 0 &&
      (!crew.employment_type || !employmentTypeFilter.includes(crew.employment_type.id));

    if (isEmploymentTypeFiltered) {
      // 既存職員の雇用形態が変更された場合
      if (existing && !existing.resignedAt) {
        statusChanges.push({
          staffId: existing.id,
          smarthrCrewId: crew.id,
          empCode: crew.emp_code || '',
          name: existing.name,
          changeType: 'employment_type_changed',
          changeDetail: crew.employment_type
            ? `雇用形態が「${crew.employment_type.name}」に変更されました`
            : '雇用形態が未設定になりました'
        });
      } else {
        skipped.push({
          smarthrCrewId: crew.id,
          empCode: crew.emp_code || '',
          name: `${crew.last_name} ${crew.first_name}`.trim(),
          reason: crew.employment_type
            ? `雇用形態「${crew.employment_type.name}」は同期対象外`
            : '雇用形態が未設定'
        });
      }
      continue;
    }

    // 退職チェック
    if (crew.resigned_at) {
      if (existing && !existing.resignedAt) {
        statusChanges.push({
          staffId: existing.id,
          smarthrCrewId: crew.id,
          empCode: crew.emp_code || '',
          name: existing.name,
          changeType: 'resigned',
          changeDetail: `退職日: ${crew.resigned_at}`,
          resignedAt: crew.resigned_at
        });
      } else {
        skipped.push({
          smarthrCrewId: crew.id,
          empCode: crew.emp_code || '',
          name: `${crew.last_name} ${crew.first_name}`.trim(),
          reason: '退職済み'
        });
      }
      continue;
    }

    const result = transformCrewToStaff(
      crew,
      departmentMappings,
      qualificationMappings,
      offices,
      qualificationMasters
    );

    if (result.skipped || !result.staff || !result.officeId) {
      skipped.push({
        smarthrCrewId: crew.id,
        empCode: crew.emp_code || '',
        name: `${crew.last_name} ${crew.first_name}`.trim(),
        reason: result.error || '不明なエラー'
      });
      continue;
    }

    const office = offices.find(o => o.id === result.officeId);

    const syncItem: SmartHRSyncItem = {
      smarthrCrewId: crew.id,
      empCode: crew.emp_code || '',
      name: result.staff.name || '',
      department: crew.department?.name || null,
      officeId: result.officeId,
      officeName: office?.name || '',
      qualifications: result.staff.qualifications || [],
      enteredAt: result.staff.enteredAt,
      resignedAt: result.staff.resignedAt,
      existingStaffId: existing?.id
    };

    if (existing) {
      toUpdate.push(syncItem);
    } else {
      toAdd.push(syncItem);
    }
  }

  return { toAdd, toUpdate, statusChanges, skipped };
}

// 同期実行
export function executeSyncItems(
  items: SmartHRSyncItem[],
  existingStaff: Staff[],
  isUpdate: boolean
): Staff[] {
  const result: Staff[] = [...existingStaff];

  for (const item of items) {
    if (isUpdate && item.existingStaffId) {
      // 既存職員の更新
      const index = result.findIndex(s => s.id === item.existingStaffId);
      if (index >= 0) {
        result[index] = {
          ...result[index],
          name: item.name,
          officeId: item.officeId,
          qualifications: item.qualifications,
          enteredAt: item.enteredAt,
          resignedAt: item.resignedAt,
          smarthrCrewId: item.smarthrCrewId,
          smarthrEmpCode: item.empCode || undefined,
          smarthrSyncedAt: new Date().toISOString()
        };
      }
    } else if (!isUpdate) {
      // 新規職員の追加
      const newStaff: Staff = {
        id: crypto.randomUUID(),
        officeId: item.officeId,
        name: item.name,
        baseSalary: 200000, // デフォルト値
        qualifications: item.qualifications,
        enteredAt: item.enteredAt,
        resignedAt: item.resignedAt,
        smarthrCrewId: item.smarthrCrewId,
        smarthrEmpCode: item.empCode || undefined,
        smarthrSyncedAt: new Date().toISOString()
      };
      result.push(newStaff);
    }
  }

  return result;
}
