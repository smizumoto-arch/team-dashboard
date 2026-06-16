import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages のサブパス配信に対応するための base。
  // 「./」にしておくと <repo>.github.io/<repo>/ でも資産パスが壊れません。
  // ※ ルーティングは GH Pages の 404 対策として HashRouter を使用します（App.jsx 参照）。
  base: './',
});
