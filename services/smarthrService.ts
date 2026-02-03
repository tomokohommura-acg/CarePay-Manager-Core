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
  BusinessType,
  BaseSalaryRevision
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
        `/crews?per_page=${perPage}&page=${page}&embed=department,employment_type,custom_fields`
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
// 部署情報を正規化するヘルパー関数
function normalizeDepartment(department: string | { id?: string; name?: string; full_path_name?: string } | null): { id: string; name: string } | null {
  if (!department) return null;

  if (typeof department === 'string') {
    // 文字列の場合、フルパスをIDとして使用し、最後の部分を名前として使用
    const parts = department.split('/');
    const name = parts[parts.length - 1] || department;
    return { id: department, name };
  }

  // オブジェクトの場合
  if (department.id && department.name) {
    return { id: department.id, name: department.name };
  }

  return null;
}

// 雇用形態情報を正規化するヘルパー関数
function normalizeEmploymentType(empType: string | { id?: string; name?: string } | null): { id: string; name: string } | null {
  if (!empType) return null;

  if (typeof empType === 'string') {
    return { id: empType, name: empType };
  }

  if (empType.id && empType.name) {
    return { id: empType.id, name: empType.name };
  }

  return null;
}

export function transformCrewToStaff(
  crew: SmartHRCrew,
  _departmentMappings: DepartmentOfficeMapping[], // 後方互換性のため残すが使用しない
  qualificationMappings: QualificationMapping[],
  offices: Office[],
  qualificationMasters: Record<BusinessType, QualificationMaster[]>,
  qualCodeToNameMap: Record<string, string> = {},
  deptNameToIdMap: Record<string, string> = {}
): { staff: Partial<Staff> | null; officeId: string | null; skipped: boolean; error?: string } {
  // 部署情報を正規化
  const normalizedDept = normalizeDepartment(crew.department);

  // full_path_nameを取得（オブジェクトの場合も対応）
  const deptFullPath = typeof crew.department === 'string'
    ? crew.department
    : (crew.department?.full_path_name || null);

  // デバッグログ
  console.log('[SmartHR Debug] crew data:', {
    id: crew.id,
    name: `${crew.last_name} ${crew.first_name}`,
    rawDepartment: crew.department,
    normalizedDept,
    deptFullPath
  });

  // 部署→事業所のマッピングを検索
  let officeId: string | null = null;
  let matchedOffice: Office | undefined = undefined;

  if (normalizedDept) {
    // 部署名からIDを取得（deptNameToIdMapを使用）
    const deptIdFromName = deptNameToIdMap[normalizedDept.name] || null;
    const deptIdFromFullPath = deptFullPath ? deptNameToIdMap[deptFullPath] : null;
    const resolvedDeptId = deptIdFromName || deptIdFromFullPath;

    // デバッグ: 事業所のsmarthrDepartmentId一覧を出力
    console.log('[SmartHR Debug] offices smarthrDepartmentId:', offices.map(o => ({
      name: o.name,
      smarthrDepartmentId: o.smarthrDepartmentId
    })));
    console.log('[SmartHR Debug] 比較対象:', {
      normalizedDeptName: normalizedDept.name,
      deptFullPath,
      deptIdFromName,
      deptIdFromFullPath,
      resolvedDeptId
    });

    // 方法1: 部署IDで事業所をマッチング
    if (resolvedDeptId) {
      matchedOffice = offices.find(o => o.smarthrDepartmentId === resolvedDeptId);
    }

    // 方法2: 名前やフルパスで直接マッチング（フォールバック）
    if (!matchedOffice) {
      matchedOffice = offices.find(o => {
        if (!o.smarthrDepartmentId) return false;
        const smarthrId = o.smarthrDepartmentId;
        // 完全一致
        if (smarthrId === normalizedDept.id || smarthrId === normalizedDept.name) return true;
        if (deptFullPath && smarthrId === deptFullPath) return true;
        // 部分一致: フルパスが事業所の部署名で終わるか
        if (deptFullPath && deptFullPath.endsWith(smarthrId)) return true;
        // 部分一致: 事業所の部署名がフルパスに含まれるか
        if (deptFullPath && deptFullPath.includes(smarthrId)) return true;
        return false;
      });
    }

    if (matchedOffice) {
      officeId = matchedOffice.id;
      console.log('[SmartHR] ✅ マッチ成功:', matchedOffice.name, '(部署:', normalizedDept.name, ', ID:', resolvedDeptId, ')');
    } else {
      // 方法2: departmentMappingsでマッチング（後方互換性）
      console.log('[SmartHR Debug] departmentMappings照合:', {
        normalizedDeptId: normalizedDept.id,
        normalizedDeptName: normalizedDept.name,
        deptFullPath,
        mappingsCount: _departmentMappings.length,
        mappings: _departmentMappings.map(m => ({
          id: m.smarthrDepartmentId,
          name: m.smarthrDepartmentName,
          fullPath: m.smarthrDepartmentFullPath,
          officeId: m.officeId
        }))
      });

      const mapping = _departmentMappings.find(m =>
        m.smarthrDepartmentId === normalizedDept.id ||
        m.smarthrDepartmentName === normalizedDept.name ||
        (deptFullPath && m.smarthrDepartmentFullPath === deptFullPath) ||
        (deptFullPath && m.smarthrDepartmentName === deptFullPath)
      );
      if (mapping) {
        officeId = mapping.officeId;
        console.log('[SmartHR] ✅ departmentMappingsでマッチ:', mapping.smarthrDepartmentName, '→', mapping.officeId);
      }
    }
  }

  if (!officeId) {
    return {
      staff: null,
      officeId: null,
      skipped: true,
      error: normalizedDept
        ? `部署「${deptFullPath || normalizedDept.name}」のマッピングが未設定`
        : '部署が未設定'
    };
  }

  // 事業所の業種を取得
  const office = matchedOffice || offices.find(o => o.id === officeId);
  if (!office) {
    return { staff: null, officeId: null, skipped: true, error: 'マッピング先の事業所が存在しません' };
  }

  // カスタム項目から資格をマッピング
  const qualifications: string[] = [];
  const businessTypeQualMasters = qualificationMasters[office.type] || [];

  // デバッグ: カスタム項目の構造を確認（全項目の名前と値を表示）
  console.log('[SmartHR Debug] custom_fields:', {
    name: `${crew.last_name} ${crew.first_name}`,
    customFieldsCount: crew.custom_fields?.length || 0,
    allFieldNames: crew.custom_fields?.map(cf => cf.template?.name || cf.name || '(no name)'),
    fieldsWithValues: crew.custom_fields?.filter(cf => cf.value).map(cf => ({
      fieldName: cf.template?.name || cf.name,
      value: cf.value,
      valueType: typeof cf.value
    })),
    qualMasters: businessTypeQualMasters.map(q => q.name)
  });

  // 資格名が入っているカスタム項目かどうかを判定
  const isQualificationNameField = (name: string): boolean => {
    if (!name.startsWith('資格')) return false;
    // 証憑、取得日、満了日、更新日などは除外
    if (name.includes('証憑') || name.includes('取得日') || name.includes('満了日') || name.includes('更新')) return false;
    return true;
  };

  for (const customField of crew.custom_fields || []) {
    const fieldName = customField.template?.name || customField.name || '';

    // 「資格①」〜「資格⑧」など、資格名が入っているカスタム項目を自動処理
    if (isQualificationNameField(fieldName)) {
      // 値を取得（オブジェクトまたは文字列）
      let qualName: string | null = null;
      let qualId: string | null = null;

      // デバッグ: 実際の値の構造を確認
      console.log('[SmartHR] 資格フィールド詳細:', {
        fieldName,
        valueType: typeof customField.value,
        valueIsObject: typeof customField.value === 'object',
        rawValue: customField.value,
        valueKeys: customField.value && typeof customField.value === 'object' ? Object.keys(customField.value) : null
      });

      if (customField.value && typeof customField.value === 'object') {
        // オブジェクトの場合、nameとidの両方を取得
        qualName = customField.value.name || null;
        qualId = customField.value.id || null;
      } else if (typeof customField.value === 'string' && customField.value) {
        // 文字列の場合（これがIDまたは名前の可能性がある）
        qualId = customField.value;
        qualName = customField.value;
      }

      // デバッグ: 資格マッチング確認
      console.log('[SmartHR Debug] 資格マッチング:', {
        fieldName,
        qualName,
        qualId,
        rawValue: customField.value,
        masters: businessTypeQualMasters.map(q => q.name)
      });

      if (qualName || qualId) {
        // マスタと照合（名前またはsmarthrCodeで照合）
        const matchingQual = businessTypeQualMasters.find(q =>
          q.name === qualName ||
          q.name === qualId ||
          q.smarthrCode === qualId ||
          q.smarthrCode === qualName
        );

        if (matchingQual && !qualifications.includes(matchingQual.id)) {
          qualifications.push(matchingQual.id);
          console.log('[SmartHR] ✅ 資格マッチ成功:', matchingQual.name);
        } else if (!matchingQual) {
          // マッチ失敗時、コードを明確に表示
          console.log(`[SmartHR] ❌ 資格マッチ失敗 - コード「${qualId || qualName}」をマスタのSmartHRコード欄に登録してください`);
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
  existingStaff: Staff[],
  qualCodeToNameMap: Record<string, string> = {},
  deptNameToIdMap: Record<string, string> = {}
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

    // 雇用形態を正規化
    const normalizedEmpType = normalizeEmploymentType(crew.employment_type);

    // デバッグ: 雇用形態フィルタの確認
    console.log('[SmartHR Debug] employment_type:', {
      name: `${crew.last_name} ${crew.first_name}`,
      rawEmpType: crew.employment_type,
      normalizedEmpType,
      filter: employmentTypeFilter
    });

    // 雇用形態でフィルタ（IDまたは名前で照合）
    const isEmploymentTypeFiltered = employmentTypeFilter.length > 0 &&
      (!normalizedEmpType || !employmentTypeFilter.some(filterId =>
        filterId === normalizedEmpType.id || filterId === normalizedEmpType.name
      ));

    if (isEmploymentTypeFiltered) {
      // 既存職員の雇用形態が変更された場合
      if (existing && !existing.resignedAt) {
        statusChanges.push({
          staffId: existing.id,
          smarthrCrewId: crew.id,
          empCode: crew.emp_code || '',
          name: existing.name,
          changeType: 'employment_type_changed',
          changeDetail: normalizedEmpType
            ? `雇用形態が「${normalizedEmpType.name}」に変更されました`
            : '雇用形態が未設定になりました'
        });
      } else {
        skipped.push({
          smarthrCrewId: crew.id,
          empCode: crew.emp_code || '',
          name: `${crew.last_name} ${crew.first_name}`.trim(),
          reason: normalizedEmpType
            ? `雇用形態「${normalizedEmpType.name}」は同期対象外`
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
      qualificationMasters,
      qualCodeToNameMap,
      deptNameToIdMap
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

    // 部署名を取得（文字列またはオブジェクト対応）
    const normalizedDeptForItem = normalizeDepartment(crew.department);

    const syncItem: SmartHRSyncItem = {
      smarthrCrewId: crew.id,
      empCode: crew.emp_code || '',
      name: result.staff.name || '',
      department: normalizedDeptForItem?.name || null,
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
      const defaultBaseSalary = 200000;
      const newStaff: Staff = {
        id: crypto.randomUUID(),
        officeId: item.officeId,
        name: item.name,
        baseSalary: defaultBaseSalary,
        baseSalaryHistory: [{
          id: crypto.randomUUID(),
          effectiveMonth: item.enteredAt?.substring(0, 7) || new Date().toISOString().substring(0, 7),
          amount: defaultBaseSalary,
          memo: 'SmartHR同期時に自動作成',
          createdAt: new Date().toISOString()
        }],
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
