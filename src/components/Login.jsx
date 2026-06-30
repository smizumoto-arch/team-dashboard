// ============================================================
// ログイン画面（Google を主／メール+パスワードは保険）
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Mail, Lock, LayoutDashboard, Loader2, ChevronDown } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

function toJpError(code) {
  const map = {
    'auth/invalid-email': 'メールアドレスの形式が正しくありません。',
    'auth/user-not-found': 'ユーザーが見つかりません。',
    'auth/wrong-password': 'パスワードが間違っています。',
    'auth/invalid-credential': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/email-already-in-use': 'このメールアドレスは既に登録されています。',
    'auth/weak-password': 'パスワードは6文字以上にしてください。',
    'auth/too-many-requests': '試行回数が多すぎます。しばらくしてからお試しください。',
    'auth/popup-closed-by-user': 'ログインがキャンセルされました。',
    'auth/operation-not-allowed': 'この認証方法は無効です（Firebaseコンソールで有効化してください）。',
  };
  return map[code] || 'エラーが発生しました。時間をおいて再度お試しください。';
}

export default function Login() {
  const { loginWithGoogle, login, signup, authError } = useAuth();
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  const go = () => navigate('/', { replace: true });

  const handleGoogle = async () => {
    setError('');
    setSubmitting(true);
    try {
      await loginWithGoogle();
      go();
    } catch (err) {
      setError(toJpError(err.code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isSignup) await signup(email, password);
      else await login(email, password);
      go();
    } catch (err) {
      setError(toJpError(err.code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mb-3">
            <LayoutDashboard size={26} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">チームタスク管理</h1>
          <p className="text-xs text-slate-400 mt-1">事業部マネージャー ダッシュボード</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {/* Google ログイン（主） */}
          <button
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.6 6.9 29.1 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19c9.8 0 18-7.1 18-19 0-1.3-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.6 6.9 29.1 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 43c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 34 26.7 35 24 35c-5.3 0-9.7-3.6-11.3-8.4l-6.5 5C9.6 38.6 16.2 43 24 43z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41.4 36.4 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"/>
            </svg>
            Google でログイン
          </button>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            社内アカウント（@ito-kyozaisha.co.jp / @codmono.com）のみ
          </p>

          {(error || authError) && (
            <p className="mt-4 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error || authError}
            </p>
          )}

          {/* メール/パスワード（保険・折りたたみ） */}
          <button
            onClick={() => setShowEmail((v) => !v)}
            className="mt-5 w-full flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600"
          >
            メールアドレスでログイン
            <ChevronDown size={14} className={'transition-transform ' + (showEmail ? 'rotate-180' : '')} />
          </button>

          {showEmail && (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs text-slate-400 mb-1">メールアドレス</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                    className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">パスワード</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6文字以上"
                    className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : isSignup ? <UserPlus size={16} /> : <LogIn size={16} />}
                {isSignup ? '登録する' : 'ログイン'}
              </button>
              <button type="button" onClick={() => { setIsSignup((v) => !v); setError(''); }}
                className="w-full text-center text-xs text-indigo-600 hover:text-indigo-700">
                {isSignup ? 'すでにアカウントをお持ちの方はこちら' : 'アカウントを新規作成する'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
