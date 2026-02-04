import { describe, it, expect } from 'vitest';
import { AppUser, OfficePermission } from '../types';

/**
 * AuthContextの権限判定ロジックをテストするためのヘルパー関数
 * AuthContext.tsxの実装と同じロジックを再現
 */

// 事業所ごとの権限を取得
function getOfficePermission(appUser: AppUser | null, officeId: string): 'edit' | 'view' | null {
  if (!appUser) return null;
  const isAdmin = appUser.role === 'admin';
  if (isAdmin) return 'edit';  // 管理者は全事業所編集可

  // 新形式: officePermissionsを使用
  if (appUser.officePermissions && appUser.officePermissions.length > 0) {
    const perm = appUser.officePermissions.find(p => p.officeId === officeId);
    return perm?.permission || null;
  }

  // 旧形式との後方互換: allowedOfficeIds
  if (appUser.allowedOfficeIds && appUser.allowedOfficeIds.length > 0) {
    if (!appUser.allowedOfficeIds.includes(officeId)) return null;
    // 旧evaluator/viewerロールの互換
    if ((appUser.role as string) === 'evaluator') return 'edit';
    return 'view';
  }

  // 未設定の場合は全事業所閲覧可能
  return 'view';
}

// 事業所にアクセスできるか（閲覧または編集）
function canAccessOffice(appUser: AppUser | null, officeId: string): boolean {
  return getOfficePermission(appUser, officeId) !== null;
}

// 事業所を編集できるか
function canEditOffice(appUser: AppUser | null, officeId: string): boolean {
  return getOfficePermission(appUser, officeId) === 'edit';
}

// 事業所を閲覧できるか（編集権限があれば閲覧も可）
function canViewOffice(appUser: AppUser | null, officeId: string): boolean {
  const perm = getOfficePermission(appUser, officeId);
  return perm === 'edit' || perm === 'view';
}

// アクセス可能な事業所IDリストを取得（null = 全事業所）
function getAllowedOfficeIds(appUser: AppUser | null): string[] | null {
  if (!appUser) return [];
  const isAdmin = appUser.role === 'admin';
  if (isAdmin) return null;  // 管理者は全事業所

  // 新形式: officePermissionsを使用
  if (appUser.officePermissions && appUser.officePermissions.length > 0) {
    return appUser.officePermissions.map(p => p.officeId);
  }

  // 旧形式との後方互換
  if (!appUser.allowedOfficeIds || appUser.allowedOfficeIds.length === 0) return null;
  return appUser.allowedOfficeIds;
}


describe('AuthContext Permission Logic', () => {
  describe('getOfficePermission', () => {
    it('appUserがnullの場合はnullを返す', () => {
      expect(getOfficePermission(null, 'office-001')).toBeNull();
    });

    it('管理者は全事業所で編集権限を持つ', () => {
      const adminUser: AppUser = {
        uid: 'admin-001',
        email: 'admin@example.com',
        displayName: '管理者',
        role: 'admin',
        createdAt: '2024-01-01T00:00:00Z'
      };

      expect(getOfficePermission(adminUser, 'office-001')).toBe('edit');
      expect(getOfficePermission(adminUser, 'office-002')).toBe('edit');
      expect(getOfficePermission(adminUser, 'any-office')).toBe('edit');
    });

    it('一般ユーザーはofficePermissionsで指定された権限を持つ', () => {
      const user: AppUser = {
        uid: 'user-001',
        email: 'user@example.com',
        displayName: '一般ユーザー',
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        officePermissions: [
          { officeId: 'office-001', permission: 'edit' },
          { officeId: 'office-002', permission: 'view' }
        ]
      };

      expect(getOfficePermission(user, 'office-001')).toBe('edit');
      expect(getOfficePermission(user, 'office-002')).toBe('view');
      expect(getOfficePermission(user, 'office-003')).toBeNull();
    });

    it('officePermissionsが空の場合、全事業所閲覧可能', () => {
      const user: AppUser = {
        uid: 'user-001',
        email: 'user@example.com',
        displayName: '一般ユーザー',
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        officePermissions: []
      };

      expect(getOfficePermission(user, 'office-001')).toBe('view');
      expect(getOfficePermission(user, 'any-office')).toBe('view');
    });

    it('officePermissionsが未設定の場合、全事業所閲覧可能', () => {
      const user: AppUser = {
        uid: 'user-001',
        email: 'user@example.com',
        displayName: '一般ユーザー',
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z'
      };

      expect(getOfficePermission(user, 'office-001')).toBe('view');
    });

    // 後方互換性テスト
    it('旧形式allowedOfficeIdsとの後方互換性', () => {
      const user: AppUser = {
        uid: 'user-001',
        email: 'user@example.com',
        displayName: '一般ユーザー',
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        allowedOfficeIds: ['office-001', 'office-002']
      };

      expect(getOfficePermission(user, 'office-001')).toBe('view');
      expect(getOfficePermission(user, 'office-002')).toBe('view');
      expect(getOfficePermission(user, 'office-003')).toBeNull();
    });
  });

  describe('canAccessOffice', () => {
    it('アクセス権限がある場合はtrueを返す', () => {
      const user: AppUser = {
        uid: 'user-001',
        email: 'user@example.com',
        displayName: '一般ユーザー',
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        officePermissions: [
          { officeId: 'office-001', permission: 'edit' },
          { officeId: 'office-002', permission: 'view' }
        ]
      };

      expect(canAccessOffice(user, 'office-001')).toBe(true);
      expect(canAccessOffice(user, 'office-002')).toBe(true);
      expect(canAccessOffice(user, 'office-003')).toBe(false);
    });

    it('appUserがnullの場合はfalseを返す', () => {
      expect(canAccessOffice(null, 'office-001')).toBe(false);
    });
  });

  describe('canEditOffice', () => {
    it('編集権限がある場合のみtrueを返す', () => {
      const user: AppUser = {
        uid: 'user-001',
        email: 'user@example.com',
        displayName: '一般ユーザー',
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        officePermissions: [
          { officeId: 'office-001', permission: 'edit' },
          { officeId: 'office-002', permission: 'view' }
        ]
      };

      expect(canEditOffice(user, 'office-001')).toBe(true);
      expect(canEditOffice(user, 'office-002')).toBe(false);
      expect(canEditOffice(user, 'office-003')).toBe(false);
    });

    it('管理者は全事業所で編集可能', () => {
      const adminUser: AppUser = {
        uid: 'admin-001',
        email: 'admin@example.com',
        displayName: '管理者',
        role: 'admin',
        createdAt: '2024-01-01T00:00:00Z'
      };

      expect(canEditOffice(adminUser, 'office-001')).toBe(true);
      expect(canEditOffice(adminUser, 'any-office')).toBe(true);
    });
  });

  describe('canViewOffice', () => {
    it('閲覧権限または編集権限がある場合はtrueを返す', () => {
      const user: AppUser = {
        uid: 'user-001',
        email: 'user@example.com',
        displayName: '一般ユーザー',
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        officePermissions: [
          { officeId: 'office-001', permission: 'edit' },
          { officeId: 'office-002', permission: 'view' }
        ]
      };

      expect(canViewOffice(user, 'office-001')).toBe(true); // 編集権限→閲覧可
      expect(canViewOffice(user, 'office-002')).toBe(true); // 閲覧権限→閲覧可
      expect(canViewOffice(user, 'office-003')).toBe(false); // 権限なし
    });
  });

  describe('getAllowedOfficeIds', () => {
    it('appUserがnullの場合は空配列を返す', () => {
      expect(getAllowedOfficeIds(null)).toEqual([]);
    });

    it('管理者はnullを返す（全事業所アクセス可）', () => {
      const adminUser: AppUser = {
        uid: 'admin-001',
        email: 'admin@example.com',
        displayName: '管理者',
        role: 'admin',
        createdAt: '2024-01-01T00:00:00Z'
      };

      expect(getAllowedOfficeIds(adminUser)).toBeNull();
    });

    it('officePermissionsから事業所IDリストを返す', () => {
      const user: AppUser = {
        uid: 'user-001',
        email: 'user@example.com',
        displayName: '一般ユーザー',
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        officePermissions: [
          { officeId: 'office-001', permission: 'edit' },
          { officeId: 'office-002', permission: 'view' }
        ]
      };

      expect(getAllowedOfficeIds(user)).toEqual(['office-001', 'office-002']);
    });

    it('officePermissionsが空の場合はnullを返す（全事業所閲覧可）', () => {
      const user: AppUser = {
        uid: 'user-001',
        email: 'user@example.com',
        displayName: '一般ユーザー',
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        officePermissions: []
      };

      expect(getAllowedOfficeIds(user)).toBeNull();
    });

    it('旧形式allowedOfficeIdsを返す', () => {
      const user: AppUser = {
        uid: 'user-001',
        email: 'user@example.com',
        displayName: '一般ユーザー',
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        allowedOfficeIds: ['office-001', 'office-002']
      };

      expect(getAllowedOfficeIds(user)).toEqual(['office-001', 'office-002']);
    });
  });

  describe('複合テストケース', () => {
    it('管理者と一般ユーザーの権限差', () => {
      const adminUser: AppUser = {
        uid: 'admin-001',
        email: 'admin@example.com',
        displayName: '管理者',
        role: 'admin',
        createdAt: '2024-01-01T00:00:00Z'
      };

      const normalUser: AppUser = {
        uid: 'user-001',
        email: 'user@example.com',
        displayName: '一般ユーザー',
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        officePermissions: [
          { officeId: 'office-001', permission: 'view' }
        ]
      };

      // 管理者は全事業所で編集可能
      expect(canEditOffice(adminUser, 'office-001')).toBe(true);
      expect(canEditOffice(adminUser, 'office-002')).toBe(true);

      // 一般ユーザーは制限あり
      expect(canEditOffice(normalUser, 'office-001')).toBe(false); // viewのみ
      expect(canViewOffice(normalUser, 'office-001')).toBe(true);
      expect(canAccessOffice(normalUser, 'office-002')).toBe(false);
    });

    it('新形式と旧形式の優先順位', () => {
      // 新形式officePermissionsが設定されている場合、旧形式allowedOfficeIdsは無視される
      const user: AppUser = {
        uid: 'user-001',
        email: 'user@example.com',
        displayName: '一般ユーザー',
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        officePermissions: [
          { officeId: 'office-001', permission: 'edit' }
        ],
        allowedOfficeIds: ['office-002', 'office-003'] // これは無視される
      };

      expect(getOfficePermission(user, 'office-001')).toBe('edit');
      expect(getOfficePermission(user, 'office-002')).toBeNull(); // 新形式にないのでnull
      expect(getOfficePermission(user, 'office-003')).toBeNull();
    });
  });
});
