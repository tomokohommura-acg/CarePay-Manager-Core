import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  obfuscateToken,
  deobfuscateToken,
  SmartHRApiError,
  transformCrewToStaff,
  generateSyncPreview,
  executeSyncItems
} from '../services/smarthrService';
import { BusinessType, Office, Staff, QualificationMaster } from '../types';
import { SmartHRCrew } from '../types/smarthr';

// モックのcrypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
});

describe('smarthrService', () => {
  describe('obfuscateToken / deobfuscateToken', () => {
    it('トークンを難読化して復元できる', () => {
      const originalToken = 'test-api-token-12345';
      const obfuscated = obfuscateToken(originalToken);

      // 難読化されたトークンは元のトークンと異なる
      expect(obfuscated).not.toBe(originalToken);

      // 復元したトークンは元のトークンと一致
      const restored = deobfuscateToken(obfuscated);
      expect(restored).toBe(originalToken);
    });

    it('空文字列を処理できる', () => {
      const obfuscated = obfuscateToken('');
      const restored = deobfuscateToken(obfuscated);
      expect(restored).toBe('');
    });

    it('長いトークンを処理できる', () => {
      // APIトークンは通常ASCIIのみ（日本語は含まない）
      const originalToken = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_-';
      const obfuscated = obfuscateToken(originalToken);
      const restored = deobfuscateToken(obfuscated);
      expect(restored).toBe(originalToken);
    });

    it('無効な難読化文字列の復元は空文字を返す', () => {
      const restored = deobfuscateToken('invalid-base64!!!');
      expect(restored).toBe('');
    });
  });

  describe('SmartHRApiError', () => {
    it('ステータスコードとメッセージを持つ', () => {
      const error = new SmartHRApiError(401, 'アクセストークンが無効です');
      expect(error.status).toBe(401);
      expect(error.message).toBe('アクセストークンが無効です');
      expect(error.name).toBe('SmartHRApiError');
    });
  });

  describe('transformCrewToStaff', () => {
    const mockOffices: Office[] = [
      { id: 'office-001', name: 'テスト事業所A', type: BusinessType.HOME_CARE, smarthrDepartmentId: 'dept-001' },
      { id: 'office-002', name: 'テスト事業所B', type: BusinessType.HOME_NURSING, smarthrDepartmentId: 'dept-002' }
    ];

    const mockQualificationMasters: Record<BusinessType, QualificationMaster[]> = {
      [BusinessType.HOME_CARE]: [
        { id: 'qual-001', name: '介護福祉士', allowance: 15000, priority: 1, smarthrCode: 'certified_care_worker' },
        { id: 'qual-002', name: '初任者研修', allowance: 5000, priority: 2 }
      ],
      [BusinessType.HOME_NURSING]: [
        { id: 'qual-n-001', name: '看護師', allowance: 30000, priority: 1 }
      ]
    };

    const deptNameToIdMap: Record<string, string> = {
      'テスト部署A': 'dept-001',
      '本部/テスト部署A': 'dept-001',
      'テスト部署B': 'dept-002'
    };

    it('部署マッピングが成功する場合', () => {
      const crew: SmartHRCrew = {
        id: 'crew-001',
        emp_code: 'EMP001',
        last_name: '山田',
        first_name: '太郎',
        department: { id: 'dept-001', name: 'テスト部署A', full_path_name: '本部/テスト部署A' },
        employment_type: { id: 'emp-type-001', name: '正社員' },
        entered_at: '2020-04-01',
        resigned_at: null,
        custom_fields: []
      };

      const result = transformCrewToStaff(
        crew,
        [],
        [],
        mockOffices,
        mockQualificationMasters,
        {},
        deptNameToIdMap
      );

      expect(result.skipped).toBe(false);
      expect(result.officeId).toBe('office-001');
      expect(result.staff).not.toBeNull();
      expect(result.staff?.name).toBe('山田 太郎');
      expect(result.staff?.enteredAt).toBe('2020-04-01');
    });

    it('部署マッピングが未設定の場合はスキップ', () => {
      const crew: SmartHRCrew = {
        id: 'crew-001',
        emp_code: 'EMP001',
        last_name: '山田',
        first_name: '太郎',
        department: { id: 'unknown-dept', name: '未知の部署', full_path_name: '本部/未知の部署' },
        employment_type: { id: 'emp-type-001', name: '正社員' },
        entered_at: '2020-04-01',
        resigned_at: null,
        custom_fields: []
      };

      const result = transformCrewToStaff(
        crew,
        [],
        [],
        mockOffices,
        mockQualificationMasters,
        {},
        deptNameToIdMap
      );

      expect(result.skipped).toBe(true);
      expect(result.error).toContain('マッピングが未設定');
    });

    it('部署が未設定の場合はスキップ', () => {
      const crew: SmartHRCrew = {
        id: 'crew-001',
        emp_code: 'EMP001',
        last_name: '山田',
        first_name: '太郎',
        department: null,
        employment_type: { id: 'emp-type-001', name: '正社員' },
        entered_at: '2020-04-01',
        resigned_at: null,
        custom_fields: []
      };

      const result = transformCrewToStaff(
        crew,
        [],
        [],
        mockOffices,
        mockQualificationMasters,
        {},
        deptNameToIdMap
      );

      expect(result.skipped).toBe(true);
      expect(result.error).toBe('部署が未設定');
    });

    it('資格カスタム項目からマッピングできる', () => {
      const crew: SmartHRCrew = {
        id: 'crew-001',
        emp_code: 'EMP001',
        last_name: '山田',
        first_name: '太郎',
        department: { id: 'dept-001', name: 'テスト部署A', full_path_name: '本部/テスト部署A' },
        employment_type: { id: 'emp-type-001', name: '正社員' },
        entered_at: '2020-04-01',
        resigned_at: null,
        custom_fields: [
          {
            template: { id: 'cf-001', name: '資格①' },
            name: '資格①',
            value: { id: 'certified_care_worker', name: '介護福祉士' }
          }
        ]
      };

      const result = transformCrewToStaff(
        crew,
        [],
        [],
        mockOffices,
        mockQualificationMasters,
        {},
        deptNameToIdMap
      );

      expect(result.skipped).toBe(false);
      expect(result.staff?.qualifications).toContain('qual-001');
    });

    it('文字列形式の部署を処理できる', () => {
      const crew: SmartHRCrew = {
        id: 'crew-001',
        emp_code: 'EMP001',
        last_name: '山田',
        first_name: '太郎',
        department: '本部/テスト部署A' as any,
        employment_type: { id: 'emp-type-001', name: '正社員' },
        entered_at: '2020-04-01',
        resigned_at: null,
        custom_fields: []
      };

      const result = transformCrewToStaff(
        crew,
        [],
        [],
        mockOffices,
        mockQualificationMasters,
        {},
        deptNameToIdMap
      );

      // 文字列形式でもマッチング可能
      expect(result.officeId).toBe('office-001');
    });
  });

  describe('generateSyncPreview', () => {
    const mockOffices: Office[] = [
      { id: 'office-001', name: 'テスト事業所A', type: BusinessType.HOME_CARE, smarthrDepartmentId: 'dept-001' }
    ];

    const mockQualificationMasters: Record<BusinessType, QualificationMaster[]> = {
      [BusinessType.HOME_CARE]: [],
      [BusinessType.HOME_NURSING]: []
    };

    const deptNameToIdMap: Record<string, string> = {
      'テスト部署A': 'dept-001'
    };

    it('新規追加の職員をプレビューに含める', () => {
      const crews: SmartHRCrew[] = [
        {
          id: 'crew-001',
          emp_code: 'EMP001',
          last_name: '山田',
          first_name: '太郎',
          department: { id: 'dept-001', name: 'テスト部署A', full_path_name: 'テスト部署A' },
          employment_type: { id: 'emp-001', name: '正社員' },
          entered_at: '2020-04-01',
          resigned_at: null,
          custom_fields: []
        }
      ];

      const preview = generateSyncPreview(
        crews,
        ['emp-001'],
        [],
        [],
        mockOffices,
        mockQualificationMasters,
        [],
        {},
        deptNameToIdMap
      );

      expect(preview.toAdd).toHaveLength(1);
      expect(preview.toAdd[0].name).toBe('山田 太郎');
      expect(preview.toUpdate).toHaveLength(0);
    });

    it('既存職員の更新をプレビューに含める', () => {
      const crews: SmartHRCrew[] = [
        {
          id: 'crew-001',
          emp_code: 'EMP001',
          last_name: '山田',
          first_name: '太郎',
          department: { id: 'dept-001', name: 'テスト部署A', full_path_name: 'テスト部署A' },
          employment_type: { id: 'emp-001', name: '正社員' },
          entered_at: '2020-04-01',
          resigned_at: null,
          custom_fields: []
        }
      ];

      const existingStaff: Staff[] = [
        {
          id: 'staff-001',
          officeId: 'office-001',
          name: '山田 太郎',
          baseSalary: 250000,
          qualifications: [],
          smarthrCrewId: 'crew-001'
        }
      ];

      const preview = generateSyncPreview(
        crews,
        ['emp-001'],
        [],
        [],
        mockOffices,
        mockQualificationMasters,
        existingStaff,
        {},
        deptNameToIdMap
      );

      expect(preview.toAdd).toHaveLength(0);
      expect(preview.toUpdate).toHaveLength(1);
      expect(preview.toUpdate[0].existingStaffId).toBe('staff-001');
    });

    it('雇用形態フィルタで除外された職員をスキップに含める', () => {
      const crews: SmartHRCrew[] = [
        {
          id: 'crew-001',
          emp_code: 'EMP001',
          last_name: '山田',
          first_name: '太郎',
          department: { id: 'dept-001', name: 'テスト部署A', full_path_name: 'テスト部署A' },
          employment_type: { id: 'emp-002', name: 'パート' },
          entered_at: '2020-04-01',
          resigned_at: null,
          custom_fields: []
        }
      ];

      const preview = generateSyncPreview(
        crews,
        ['emp-001'], // 正社員のみ
        [],
        [],
        mockOffices,
        mockQualificationMasters,
        [],
        {},
        deptNameToIdMap
      );

      expect(preview.toAdd).toHaveLength(0);
      expect(preview.skipped).toHaveLength(1);
      expect(preview.skipped[0].reason).toContain('同期対象外');
    });

    it('退職済み職員をスキップに含める', () => {
      const crews: SmartHRCrew[] = [
        {
          id: 'crew-001',
          emp_code: 'EMP001',
          last_name: '山田',
          first_name: '太郎',
          department: { id: 'dept-001', name: 'テスト部署A', full_path_name: 'テスト部署A' },
          employment_type: { id: 'emp-001', name: '正社員' },
          entered_at: '2020-04-01',
          resigned_at: '2024-03-31',
          custom_fields: []
        }
      ];

      const preview = generateSyncPreview(
        crews,
        ['emp-001'],
        [],
        [],
        mockOffices,
        mockQualificationMasters,
        [],
        {},
        deptNameToIdMap
      );

      expect(preview.toAdd).toHaveLength(0);
      expect(preview.skipped).toHaveLength(1);
      expect(preview.skipped[0].reason).toBe('退職済み');
    });

    it('既存職員の退職をステータス変更に含める', () => {
      const crews: SmartHRCrew[] = [
        {
          id: 'crew-001',
          emp_code: 'EMP001',
          last_name: '山田',
          first_name: '太郎',
          department: { id: 'dept-001', name: 'テスト部署A', full_path_name: 'テスト部署A' },
          employment_type: { id: 'emp-001', name: '正社員' },
          entered_at: '2020-04-01',
          resigned_at: '2024-03-31',
          custom_fields: []
        }
      ];

      const existingStaff: Staff[] = [
        {
          id: 'staff-001',
          officeId: 'office-001',
          name: '山田 太郎',
          baseSalary: 250000,
          qualifications: [],
          smarthrCrewId: 'crew-001'
          // resignedAt未設定
        }
      ];

      const preview = generateSyncPreview(
        crews,
        ['emp-001'],
        [],
        [],
        mockOffices,
        mockQualificationMasters,
        existingStaff,
        {},
        deptNameToIdMap
      );

      expect(preview.statusChanges).toHaveLength(1);
      expect(preview.statusChanges[0].changeType).toBe('resigned');
    });
  });

  describe('executeSyncItems', () => {
    it('新規職員を追加する', () => {
      const items = [
        {
          smarthrCrewId: 'crew-001',
          empCode: 'EMP001',
          name: '山田 太郎',
          department: 'テスト部署',
          officeId: 'office-001',
          officeName: 'テスト事業所',
          qualifications: ['qual-001'],
          enteredAt: '2020-04-01'
        }
      ];

      const result = executeSyncItems(items, [], false);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('山田 太郎');
      expect(result[0].baseSalary).toBe(200000); // デフォルト値
      expect(result[0].smarthrCrewId).toBe('crew-001');
      expect(result[0].baseSalaryHistory).toHaveLength(1);
    });

    it('既存職員を更新する', () => {
      const existingStaff: Staff[] = [
        {
          id: 'staff-001',
          officeId: 'office-001',
          name: '山田 太郎',
          baseSalary: 250000,
          qualifications: []
        }
      ];

      const items = [
        {
          smarthrCrewId: 'crew-001',
          empCode: 'EMP001',
          name: '山田 太郎（更新）',
          department: 'テスト部署',
          officeId: 'office-002',
          officeName: 'テスト事業所B',
          qualifications: ['qual-001'],
          enteredAt: '2020-04-01',
          existingStaffId: 'staff-001'
        }
      ];

      const result = executeSyncItems(items, existingStaff, true);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('staff-001');
      expect(result[0].name).toBe('山田 太郎（更新）');
      expect(result[0].officeId).toBe('office-002');
      expect(result[0].qualifications).toContain('qual-001');
      expect(result[0].baseSalary).toBe(250000); // 基本給は変更されない
    });

    it('更新モードで新規追加しない', () => {
      const items = [
        {
          smarthrCrewId: 'crew-001',
          empCode: 'EMP001',
          name: '山田 太郎',
          department: 'テスト部署',
          officeId: 'office-001',
          officeName: 'テスト事業所',
          qualifications: []
          // existingStaffIdなし
        }
      ];

      const result = executeSyncItems(items, [], true);

      expect(result).toHaveLength(0);
    });
  });
});
