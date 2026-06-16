# チームタスク管理ダッシュボード（Vite + React + Firebase）

既存プロトタイプ `../team-dashboard/index.html` を、Firebase 認証 + Firestore + GitHub Pages 公開に対応させた本番用プロジェクトです。

## 必要環境
- Node.js 18 以上（npm 同梱）

## セットアップ（ステップ1・2）

```powershell
# 1. このフォルダへ移動
cd team-dashboard-app

# 2. 依存関係のインストール
npm install

# 3. 環境変数ファイルを作成し、Firebase の値を記入
Copy-Item .env.example .env
#   → .env を開いて VITE_FIREBASE_API_KEY などを実際の値に書き換える
#   （Firebase コンソール → プロジェクト設定 → 全般 → マイアプリ）

# 4. 開発サーバー起動
npm run dev
#   → http://localhost:5173 を開く
```

## Firebase コンソール側の準備
1. プロジェクト `hoisapo-pj` を開く
2. Authentication → Sign-in method → **メール / パスワード** を有効化
3. （任意）Authentication → Settings → 承認済みドメイン に
   `smizumoto-arch.github.io` を追加（ステップ5の公開後に必要）

## 構成
```
team-dashboard-app/
├─ .env / .env.example      … Firebase 設定（.env はコミットしない）
├─ index.html               … Vite エントリ
├─ vite.config.js
├─ tailwind.config.js / postcss.config.js
└─ src/
   ├─ main.jsx              … AuthProvider でアプリを包む
   ├─ App.jsx               … HashRouter によるルーティング（保護ルート）
   ├─ firebase.js           … 【ステップ1】Firebase 初期化
   ├─ index.css             … Tailwind
   ├─ auth/
   │  ├─ AuthContext.jsx    … 【ステップ2】認証状態の供給・login/signup/logout
   │  └─ ProtectedRoute.jsx … 【ステップ2】未ログインを /login へ弾く
   └─ components/
      ├─ Login.jsx          … 【ステップ2】ログイン/新規登録画面
      └─ Dashboard.jsx      … （仮）ステップ3で本実装＋Firestore連携
```

## ステップ達成状況（コードはすべて実装済み）
- [x] ステップ1: Firebase 初期化（`src/firebase.js`）
- [x] ステップ2: ログイン画面 + 保護ルート（`src/auth/`, `src/components/Login.jsx`）
- [x] ステップ3: Dashboard を Firestore CRUD（`users/{uid}/tasks/{taskId}`）へ
- [x] ステップ4: `firestore.rules`（本人のみ自分のデータを読み書き）
- [x] ステップ5: GitHub Pages 自動デプロイ（`.github/workflows/deploy.yml`）

## 公開手順
あなたのアカウントでの操作（Firebase設定値の取得・認証ON・GitHub設定など）は
👉 **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** にクリック単位でまとめています。こちらを順に進めてください。

## データ構造とセキュリティ
- タスク: `users/{uid}/tasks/{taskId}` … `{ name, assignee, due, status, priority, createdAt }`
- フラグ: `users/{uid}/meta/app` … `{ seeded: true }`（初回サンプル投入の重複防止）
- ルール: 認証済みかつ本人（`request.auth.uid == userId`）のみ読み書き可。
  nursery-guidance-app（同じ hoisapo-pj）の `users/{uid}/nurseries` も同ルールで安全に共存します。
