import React, { useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types';
import { getAllUsers, createUser, updateUser, deleteUser } from '../services/firestoreService';

interface UserManagementProps {
  currentUser: AppUser;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 新規ユーザー追加用
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const [adding, setAdding] = useState(false);

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
        const roleOrder = { admin: 0, evaluator: 1, viewer: 2 };
        return roleOrder[a.role] - roleOrder[b.role];
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
      // メールアドレスで仮登録（UIDは後で更新）
      const tempUid = `pending_${Date.now()}`;
      const newUser: AppUser = {
        uid: tempUid,
        email: newEmail.trim().toLowerCase(),
        displayName: newEmail.split('@')[0],
        role: newRole,
        createdAt: new Date().toISOString()
      };

      await createUser(newUser);
      setUsers(prev => [...prev, newUser]);
      setShowAddModal(false);
      setNewEmail('');
      setNewRole('viewer');
    } catch (err) {
      console.error('Failed to add user:', err);
      setError('ユーザーの追加に失敗しました');
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      await updateUser(uid, { role: newRole });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Failed to update role:', err);
      setError('権限の更新に失敗しました');
    }
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
      case 'evaluator':
        return <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">評価者</span>;
      case 'viewer':
        return <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">閲覧者</span>;
    }
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
          <strong>評価者:</strong> 評価データの入力・編集が可能<br />
          <strong>閲覧者:</strong> データの閲覧のみ可能
        </p>
      </div>

      {/* ユーザー一覧 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">ユーザー</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">メールアドレス</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">権限</th>
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
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="admin">管理者</option>
                      <option value="evaluator">評価者</option>
                      <option value="viewer">閲覧者</option>
                    </select>
                  )}
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
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in duration-200">
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
                <label className="block text-sm font-bold text-slate-700 mb-2">権限</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="viewer">閲覧者</option>
                  <option value="evaluator">評価者</option>
                  <option value="admin">管理者</option>
                </select>
              </div>
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
    </div>
  );
};
