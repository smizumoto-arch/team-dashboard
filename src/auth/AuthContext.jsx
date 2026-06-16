// ============================================================
// ステップ2-a: 認証コンテキスト
// ------------------------------------------------------------
// ・現在のログインユーザー(user)とローディング状態(loading)を全画面に供給
// ・login / signup / logout のヘルパーを提供
// ・onAuthStateChanged でログイン状態の変化を購読
// ============================================================
import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext(null);

// 各コンポーネントから useAuth() で認証情報を取得できる
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // 初回の認証状態確認中

  useEffect(() => {
    // ログイン状態を監視。ページ再読込時もここで自動復帰する。
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe; // アンマウント時に購読解除
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const signup = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  const value = { user, loading, login, signup, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
