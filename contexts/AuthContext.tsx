import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { AppUser, UserRole } from '../types';
import { getUser, getUserByEmail, createUser } from '../services/firestoreService';

interface AuthContextType {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isEvaluator: boolean;
  canEdit: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INITIAL_ADMIN_EMAIL = import.meta.env.VITE_INITIAL_ADMIN_EMAIL || '';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Firebase認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        try {
          // Firestoreからユーザー情報を取得
          let existingUser = await getUser(user.uid);

          if (!existingUser) {
            // メールアドレスで事前登録ユーザーをチェック
            existingUser = await getUserByEmail(user.email || '');

            if (existingUser) {
              // 事前登録されているユーザー → UIDを更新
              existingUser = {
                ...existingUser,
                uid: user.uid,
                displayName: user.displayName || existingUser.displayName,
                photoURL: user.photoURL || existingUser.photoURL
              };
              await createUser(existingUser);
            } else if (INITIAL_ADMIN_EMAIL && user.email === INITIAL_ADMIN_EMAIL) {
              // 初期管理者として登録
              existingUser = {
                uid: user.uid,
                email: user.email!,
                displayName: user.displayName || user.email!.split('@')[0],
                photoURL: user.photoURL || undefined,
                role: 'admin',
                createdAt: new Date().toISOString()
              };
              await createUser(existingUser);
            } else {
              // 未登録ユーザー → アクセス拒否
              setError('アクセス権限がありません。管理者に連絡してください。');
              await signOut(auth);
              setAppUser(null);
              setLoading(false);
              return;
            }
          }

          setAppUser(existingUser);
          setError(null);
        } catch (err) {
          console.error('Error loading user data:', err);
          setError('ユーザー情報の読み込みに失敗しました。');
        }
      } else {
        setAppUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('ログインがキャンセルされました。');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('このドメインは認証に許可されていません。');
      } else {
        setError('ログインに失敗しました。');
      }
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setAppUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError('ログアウトに失敗しました。');
    }
  };

  const isAdmin = appUser?.role === 'admin';
  const isEvaluator = appUser?.role === 'evaluator' || isAdmin;
  const canEdit = isEvaluator;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        appUser,
        loading,
        error,
        signInWithGoogle,
        logout,
        isAdmin,
        isEvaluator,
        canEdit
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
