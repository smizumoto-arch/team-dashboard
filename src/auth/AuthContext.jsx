// ============================================================
// 認証コンテキスト（Google + メール/パスワード）
// ------------------------------------------------------------
// ・連携仕様に合わせ Google ログインを主とする（uid/email がほいさぽと一致）
// ・許可ドメイン(@ito-kyozaisha.co.jp / @codmono.com)以外は自動ログアウト
// ・当面の保険としてメール/パスワードも残す（Googleが未設定でも動くように）
// ============================================================
import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';
import { isAllowedEmail, ALLOWED_EMAIL_DOMAINS } from '../integration/contract';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // ドメイン制限：許可外のアカウントはログインさせない
      if (currentUser && !isAllowedEmail(currentUser.email)) {
        await signOut(auth);
        setUser(null);
        setAuthError(
          `このアカウント(${currentUser.email})は許可されていません。` +
            `${ALLOWED_EMAIL_DOMAINS.map((d) => '@' + d).join(' / ')} のみ利用できます。`
        );
        setLoading(false);
        return;
      }
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const provider = new GoogleAuthProvider();
  // 同一ドメインのアカウント選択を促す（任意のヒント）
  provider.setCustomParameters({ prompt: 'select_account' });

  const loginWithGoogle = () => { setAuthError(''); return signInWithPopup(auth, provider); };
  const login = (email, password) => { setAuthError(''); return signInWithEmailAndPassword(auth, email, password); };
  const signup = (email, password) => { setAuthError(''); return createUserWithEmailAndPassword(auth, email, password); };
  const logout = () => signOut(auth);

  const value = { user, loading, authError, setAuthError, loginWithGoogle, login, signup, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
