# 公開までの完全ガイド（クリック手順）

コードはすべて作成済みです。ここから先は **あなたのアカウントでしかできない操作** だけを、順番に進めてください。所要 15〜20分ほどです。

公開後のURLは最終的にこうなります 👉 **https://smizumoto-arch.github.io/team-dashboard/**

---

## 全体の流れ
1. Firebase の設定値を6つ取得する
2. Firebase でメール/パスワード認証をONにする
3. Firestore のセキュリティルールを確認・設定する
4. GitHub にリポジトリを作り、このフォルダの中身をアップロードする
5. GitHub の設定（Pages を「Actions」に / シークレット6つを登録）
6. 自動でビルド＆公開 → URLにアクセス

---

## STEP A. Firebase の設定値を取得（6つ）

1. https://console.firebase.google.com/ を開き、プロジェクト **hoisapo-pj** を選択
2. 左上の ⚙️（歯車）→ **プロジェクトの設定**
3. 下にスクロールして「マイアプリ」セクション
   - Web アプリ（`</>`）が既にあれば、その「SDK の設定と構成」→「構成」を選択
   - 無ければ `</>` ボタンで新規Webアプリを追加（アプリ名は「team-dashboard」など）
4. 表示される `firebaseConfig` から次の6つの値を控える：

| 控える値 | firebaseConfig のキー |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain`（= `hoisapo-pj.firebaseapp.com`）|
| `VITE_FIREBASE_PROJECT_ID` | `projectId`（= `hoisapo-pj`）|
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

> この6つは STEP E のGitHubシークレット登録で使います。メモ帳などに貼っておいてください。

---

## STEP B. メール/パスワード認証をONにする

1. Firebase コンソール左メニュー → **Authentication**
2. 「始める」（初回のみ）→ **Sign-in method** タブ
3. 「メール / パスワード」を選び、**有効にする** → 保存

> これをしないとログインできません。

---

## STEP C. Firestore セキュリティルール（← 他アプリを壊さないため要確認）

このアプリと nursery-guidance-app は **同じプロジェクト hoisapo-pj** を使っています。ルールはプロジェクト全体に効くので、慎重に進めます。

1. Firebase コンソール左メニュー → **Firestore Database** → **ルール** タブ
2. 今表示されているルールを見てください。次のような行が **既にあるか** 確認：
   ```
   match /users/{userId}/{document=**} {
     allow read, write: if request.auth != null && request.auth.uid == userId;
   }
   ```
   - **既にある場合** → 何も変更しなくてOK（team-dashboard のデータも自動で保護されます）。STEP D へ。
   - **無い／内容が違う場合** → このフォルダの `firestore.rules` の中身に置き換えて「公開」。
     （このルールは nursery のデータ `users/{uid}/nurseries` も同じ「本人のみ許可」で守るので、壊れません）

> 不安な場合は、変更前のルールをメモ帳にコピーして保管しておくと安心です。

---

## STEP D. GitHub にリポジトリを作成 & アップロード

1. https://github.com/new を開く（**smizumoto-arch** でログイン）
2. Repository name: **team-dashboard**
3. Public を選択 → **Create repository**
4. 作成後の画面で「uploading an existing file」リンクをクリック
5. **このフォルダ（team-dashboard-app）の「中身」をすべて** ドラッグ＆ドロップでアップロード
   - ⚠️ `team-dashboard-app` というフォルダごとではなく、**中身（src フォルダ・package.json・index.html・.github フォルダなど）をリポジトリの直下**に置きます
   - `.github` フォルダ（自動デプロイ設定）も忘れず含めてください
   - `node_modules` や `dist` は無くてOK（そもそも作られていません）
6. 「Commit changes」

> Gitに慣れている場合は、このフォルダで `git init → add → commit → git remote add origin ... → push` でもOKです。

---

## STEP E. GitHub の設定（Pages と シークレット）

### E-1. Pages を「Actions」に
1. リポジトリ → **Settings** → 左メニュー **Pages**
2. 「Build and deployment」→ Source を **GitHub Actions** に変更

### E-2. Firebase の値をシークレット登録（6つ）
1. リポジトリ → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** で、STEP A で控えた6つを1つずつ登録：

| Name | Secret（値）|
|---|---|
| `VITE_FIREBASE_API_KEY` | （apiKey の値）|
| `VITE_FIREBASE_AUTH_DOMAIN` | hoisapo-pj.firebaseapp.com |
| `VITE_FIREBASE_PROJECT_ID` | hoisapo-pj |
| `VITE_FIREBASE_STORAGE_BUCKET` | （storageBucket の値）|
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | （messagingSenderId の値）|
| `VITE_FIREBASE_APP_ID` | （appId の値）|

---

## STEP F. 公開を待つ & 確認

1. リポジトリの **Actions** タブを開く → 「Deploy to GitHub Pages」が自動で走ります（数分）
   - もし走っていなければ、ファイルを少し変更して再push、または Actions 画面の「Run workflow」
2. 緑のチェック✅になったら **https://smizumoto-arch.github.io/team-dashboard/** を開く
3. ログイン画面が出る → STEP B で作る（または新規登録）したメール/パスワードでログイン
4. 初回はサンプルタスクが自動投入され、ダッシュボードが表示されます 🎉

---

## STEP G. Firebase に公開ドメインを許可（ログインが弾かれる場合）

公開URLでログインがエラーになる場合：
1. Firebase コンソール → **Authentication** → **Settings** → **承認済みドメイン**
2. `smizumoto-arch.github.io` を **追加**

---

## （任意）自分のPCで動かす場合 — Node が必要

```powershell
cd team-dashboard-app
npm install
Copy-Item .env.example .env   # → .env を開いて STEP A の6値を記入
npm run dev                   # http://localhost:5173
```

PCにNodeがあり、Actions方式でなく手動で公開したい場合：
```powershell
npm run deploy   # gh-pages ブランチへ公開（Pages の Source を gh-pages に設定）
```

---

## つまずいたら
- **ログイン画面が真っ白 / コンソールにエラー** → STEP E-2 のシークレット名が正確か（`VITE_` 接頭辞含む）を確認
- **auth/operation-not-allowed** → STEP B（メール認証ON）が未実施
- **auth/unauthorized-domain** → STEP G（承認済みドメイン追加）
- **Missing or insufficient permissions** → STEP C（Firestoreルール）を確認
