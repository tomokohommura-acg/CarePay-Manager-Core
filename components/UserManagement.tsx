import React, { useState, useEffect } from 'react';
import { AppUser, UserRole, Office, OfficePermission, OfficePermissionLevel } from '../types';
import { getAllUsers, createUser, updateUser, deleteUser } from '../services/firestoreService';

interface UserManagementProps {
  currentUser: AppUser;
  offices: Office[];
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser, offices }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 新規ユーザー追加用
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [newOfficePermissions, setNewOfficePermissions] = useState<OfficePermission[]>([]);
  const [adding, setAdding] = useState(false);

  // 編集用
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editOfficePermissions, setEditOfficePermissions] = useState<OfficePermission[]>([]);

  // 削除確認用
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers.sort((a, b) => {
        // 管理者を先頭に
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return 0;
      }));
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('ユーザー一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newEmail.trim()) return;

    setAdding(true);
    try {
      const tempUid = `pending_${Date.now()}`;
      const newUser: AppUser = {
        uid: tempUid,
        email: newEmail.trim().toLowerCase(),
        displayName: newEmail.split('@')[0],
        role: newRole,
        officePermissions: newRole === 'admin' ? [] : newOfficePermissions,
        createdAt: new Date().toISOString()
      };

      await createUser(newUser);
      setUsers(prev => [...prev, newUser]);
      setShowAddModal(false);
      setNewEmail('');
      setNewRole('user');
      setNewOfficePermissions([]);
    } catch (err) {
      console.error('Failed to add user:', err);
      setError('ユーザーの追加に失敗しました');
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      const updates: Partial<AppUser> = { role: newRole };
      if (newRole === 'admin') {
        updates.officePermissions = [];
      }
      await updateUser(uid, updates);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, ...updates } : u));
    } catch (err) {
      console.error('Failed to update role:', err);
      setError('権限の更新に失敗しました');
    }
  };

  const handleOpenEditOffices = (user: AppUser) => {
    setEditingUser(user);
    // 既存のofficePermissionsがあればそれを使用、なければ旧形式から変換
    if (user.officePermissions && user.officePermissions.length > 0) {
      setEditOfficePermissions([...user.officePermissions]);
    } else if (user.allowedOfficeIds && user.allowedOfficeIds.length > 0) {
      // 旧形式からの変換: roleに基づいて権限を設定
      const perm: OfficePermissionLevel = user.role === 'evaluator' ? 'edit' : 'view';
      setEditOfficePermissions(user.allowedOfficeIds.map(id => ({ officeId: id, permission: perm })));
    } else {
      setEditOfficePermissions([]);
    }
  };

  const handleSaveOfficePermissions = async () => {
    if (!editingUser) return;

    try {
      await updateUser(editingUser.uid, { officePermissions: editOfficePermissions });
      setUsers(prev => prev.map(u => u.uid === editingUser.uid ? { ...u, officePermissions: editOfficePermissions } : u));
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to update office permissions:', err);
      setError('事業所権限の更新に失敗しました');
    }
  };

  const setOfficePermission = (
    officeId: string,
    permission: OfficePermissionLevel | 'none',
    permissions: OfficePermission[],
    setPermissions: (p: OfficePermission[]) => void
  ) => {
    if (permission === 'none') {
      setPermissions(permissions.filter(p => p.officeId !== officeId));
    } else {
      const existing = permissions.find(p => p.officeId === officeId);
      if (existing) {
        setPermissions(permissions.map(p => p.officeId === officeId ? { ...p, permission } : p));
      } else {
        setPermissions([...permissions, { officeId, permission }]);
      }
    }
  };

  const getOfficePermissionLevel = (officeId: string, permissions: OfficePermission[]): OfficePermissionLevel | 'none' => {
    const perm = permissions.find(p => p.officeId === officeId);
    return perm?.permission || 'none';
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    try {
      await deleteUser(deleteTarget.uid);
      setUsers(prev => prev.filter(u => u.uid !== deleteTarget.uid));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError('ユーザーの削除に失敗しました');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1 rounded-full">管理者</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">一般</span>;
    }
  };

  // ユーザーの権限サマリーを取得
  const getPermissionSummary = (user: AppUser): React.ReactNode => {
    if (user.role === 'admin') {
      return <span className="text-xs text-slate-400">全事業所（全権限）</span>;
    }

    const perms = user.officePermissions || [];
    if (perms.length === 0) {
      // 旧形式のチェック
      if (user.allowedOfficeIds && user.allowedOfficeIds.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {user.allowedOfficeIds.slice(0, 2).map(officeId => {
              const office = offices.find(o => o.id === officeId);
              return (
                <span key={officeId} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                  {office?.name || '不明'}
                </span>
              );
            })}
            {user.allowedOfficeIds.length > 2 && (
              <span className="text-xs text-slate-400">+{user.allowedOfficeIds.length - 2}</span>
            )}
          </div>
        );
      }
      return <span className="text-xs text-slate-400">全事業所</span>;
    }

    const editCount = perms.filter(p => p.permission === 'edit').length;
    const viewCount = perms.filter(p => p.permission === 'view').length;

    return (
      <div className="flex flex-wrap gap-1">
        {editCount > 0 && (
          <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded">
            編集: {editCount}件
          </span>
        )}
        {viewCount > 0 && (
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
            閲覧: {viewCount}件
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          👥 ユーザー管理
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
        >
          <span>+</span> ユーザーを追加
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-600">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">閉じる</button>
        </div>
      )}

      {/* 権限説明 */}
      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <p className="text-xs text-indigo-600 leading-relaxed">
          <strong>管理者:</strong> 全機能にアクセス可能（マスタ管理、SmartHR連携、ユーザー管理）<br />
          <strong>一般ユーザー:</strong> 事業所ごとに「編集」または「閲覧」権限を設定可能（未設定=全事業所閲覧）
        </p>
      </div>

      {/* ユーザー一覧 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">ユーザー</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">メールアドレス</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">ロール</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">事業所権限</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">登録日</th>
              <th className="px-6 py-4 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.uid} className={`hover:bg-slate-50/50 transition-colors ${user.uid === currentUser.uid ? 'bg-indigo-50/30' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 text-sm">
                        {user.displayName?.[0] || '?'}
                      </div>
                    )}
                    <span className="font-medium text-slate-700">
                      {user.displayName}
                      {user.uid === currentUser.uid && (
                        <span className="ml-2 text-xs text-indigo-500">(あなた)</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {user.email}
                  {user.uid.startsWith('pending_') && (
                    <span className="ml-2 text-xs text-amber-500">(未ログイン)</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {user.uid === currentUser.uid ? (
                    getRoleBadge(user.role)
                  ) : (
                    <select
                      value={user.role === 'admin' ? 'admin' : 'user'}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="admin">管理者</option>
                      <option value="user">一般</option>
                    </select>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getPermissionSummary(user)}
                    {user.uid !== currentUser.uid && user.role !== 'admin' && (
                      <button
                        onClick={() => handleOpenEditOffices(user)}
                        className="text-indigo-500 hover:text-indigo-700 text-xs underline ml-1"
                      >
                        設定
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  {user.uid !== currentUser.uid && (
                    <button
                      onClick={() => setDeleteTarget(user)}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-2"
                      title="削除"
                    >
                      🗑️
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ユーザー追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                ➕
              </div>
              <h4 className="text-xl font-bold text-slate-800">ユーザーを追加</h4>
              <p className="text-sm text-slate-500 mt-1">追加したメールアドレスでログインできるようになります</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">メールアドレス</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ロール</label>
                <select
                  value={newRole}
                  onChange={(e) => {
                    setNewRole(e.target.value as UserRole);
                    if (e.target.value === 'admin') {
                      setNewOfficePermissions([]);
                    }
                  }}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="user">一般ユーザー</option>
                  <option value="admin">管理者</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  {newRole === 'admin' ? '全事業所に対して全権限を持ちます' : '事業所ごとに権限を設定できます'}
                </p>
              </div>

              {newRole !== 'admin' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    事業所ごとの権限
                    <span className="ml-2 text-xs font-normal text-slate-400">（未設定=全事業所閲覧のみ）</span>
                  </label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-bold text-slate-500">事業所</th>
                          <th className="px-3 py-2 text-center text-xs font-bold text-slate-500 w-20">編集</th>
                          <th className="px-3 py-2 text-center text-xs font-bold text-slate-500 w-20">閲覧</th>
                          <th className="px-3 py-2 text-center text-xs font-bold text-slate-500 w-20">なし</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {offices.map(office => {
                          const level = getOfficePermissionLevel(office.id, newOfficePermissions);
                          return (
                            <tr key={office.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-700">{office.name}</td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="radio"
                                  name={`new-perm-${office.id}`}
                                  checked={level === 'edit'}
                                  onChange={() => setOfficePermission(office.id, 'edit', newOfficePermissions, setNewOfficePermissions)}
                                  className="text-amber-500 focus:ring-amber-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="radio"
                                  name={`new-perm-${office.id}`}
                                  checked={level === 'view'}
                                  onChange={() => setOfficePermission(office.id, 'view', newOfficePermissions, setNewOfficePermissions)}
                                  className="text-blue-500 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="radio"
                                  name={`new-perm-${office.id}`}
                                  checked={level === 'none'}
                                  onChange={() => setOfficePermission(office.id, 'none', newOfficePermissions, setNewOfficePermissions)}
                                  className="text-slate-400 focus:ring-slate-400"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {newOfficePermissions.length > 0 && (
                    <p className="text-xs text-indigo-600 mt-2">
                      編集: {newOfficePermissions.filter(p => p.permission === 'edit').length}件、
                      閲覧: {newOfficePermissions.filter(p => p.permission === 'view').length}件
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddUser}
                disabled={!newEmail.trim() || adding}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? '追加中...' : '追加する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                ⚠️
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">ユーザーを削除しますか？</h4>
              <p className="text-slate-500 text-sm mb-8">
                「{deleteTarget.displayName}」({deleteTarget.email}) を削除します。<br />
                このユーザーはログインできなくなります。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 事業所権限編集モーダル */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                🏢
              </div>
              <h4 className="text-xl font-bold text-slate-800">事業所ごとの権限を設定</h4>
              <p className="text-sm text-slate-500 mt-1">
                「{editingUser.displayName}」の権限を設定
              </p>
            </div>

            <div className="mb-6">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-500">事業所</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-amber-600 w-20">編集</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-blue-600 w-20">閲覧</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-slate-400 w-20">なし</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {offices.map(office => {
                      const level = getOfficePermissionLevel(office.id, editOfficePermissions);
                      return (
                        <tr key={office.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-700">{office.name}</td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="radio"
                              name={`edit-perm-${office.id}`}
                              checked={level === 'edit'}
                              onChange={() => setOfficePermission(office.id, 'edit', editOfficePermissions, setEditOfficePermissions)}
                              className="text-amber-500 focus:ring-amber-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="radio"
                              name={`edit-perm-${office.id}`}
                              checked={level === 'view'}
                              onChange={() => setOfficePermission(office.id, 'view', editOfficePermissions, setEditOfficePermissions)}
                              className="text-blue-500 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="radio"
                              name={`edit-perm-${office.id}`}
                              checked={level === 'none'}
                              onChange={() => setOfficePermission(office.id, 'none', editOfficePermissions, setEditOfficePermissions)}
                              className="text-slate-400 focus:ring-slate-400"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="text-slate-500">
                  {editOfficePermissions.length === 0 ? (
                    <span>未設定 = 全事業所閲覧のみ</span>
                  ) : (
                    <span>
                      編集: {editOfficePermissions.filter(p => p.permission === 'edit').length}件、
                      閲覧: {editOfficePermissions.filter(p => p.permission === 'view').length}件
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setEditOfficePermissions([])}
                  className="text-slate-400 hover:text-slate-600 underline"
                >
                  すべてクリア
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveOfficePermissions}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-colors"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
