// ============================================================
// ステップ2-b: 保護されたルート
// ------------------------------------------------------------
// ・認証状態の確認中はローディング表示
// ・未ログインなら /login へリダイレクト
// ・ログイン済みなら子要素（ダッシュボード等）を表示
// ============================================================
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        読み込み中...
      </div>
    );
  }

  if (!user) {
    // 未ログイン → ログイン画面へ（履歴を残さない）
    return <Navigate to="/login" replace />;
  }

  return children;
}
