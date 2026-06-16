// ============================================================
// ステップ2-c: ログイン / 新規登録 画面
// ------------------------------------------------------------
// ・Email + Password でログイン／新規登録を切り替え
// ・成功したら "/" （ダッシュボード）へ遷移
// ・既にログイン済みでこの画面に来た場合も "/" へ
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Mail, Lock, LayoutDashboard, Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

// Firebase Auth のエラーコードを日本語に変換
function toJpError(code) {
  const map = {
    'auth/invalid-email': 'メールアドレスの形式が正しくありません。',
    'auth/user-not-found': 'ユーザーが見つかりません。',
    'auth/wrong-password': 'パスワードが間違っています。',
    'auth/invalid-credential': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/email-already-in-use': 'このメールアドレスは既に登録されています。',
    'auth/weak-password': 'パスワードは6文字以上にしてください。',
    'auth/too-many-requests': '試行回数が多すぎます。しばらくしてからお試しください。',
  };
  return map[code] || 'エラーが発生しました。時間をおいて再度お試しください。';
}

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate('/', { replace: true }); // 成功 → ダッシュボードへ
    } catch (err) {
      setError(toJpError(err.code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mb-3">
            <LayoutDashboard size={26} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">チームタスク管理</h1>
          <p className="text-xs text-slate-400 mt-1">事業部マネージャー ダッシュボード</p>
        </div>

        {/* カード */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-5 text-center">
            {isSignup ? '新規登録' : 'ログイン'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">メールアドレス</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">パスワード</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6文字以上"
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isSignup ? (
                <UserPlus size={16} />
              ) : (
                <LogIn size={16} />
              )}
              {isSignup ? '登録する' : 'ログイン'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsSignup((v) => !v);
                setError('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-700"
            >
              {isSignup ? 'すでにアカウントをお持ちの方はこちら' : 'アカウントを新規作成する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
