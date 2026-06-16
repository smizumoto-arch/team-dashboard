// ============================================================
// ルーティング配線
// ------------------------------------------------------------
// ・/login        … ログイン画面（誰でもアクセス可）
// ・/             … ダッシュボード（ProtectedRoute で保護）
// ・それ以外       … "/" へ
//
// ※ GitHub Pages はサーバー側ルーティングが無く、/path 直アクセスで
//    404 になりがちなので、URL に # を使う HashRouter を採用します。
//    （ステップ5のデプロイでそのまま動きます）
// ============================================================
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './auth/ProtectedRoute';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
