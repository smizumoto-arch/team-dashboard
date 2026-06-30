# 連携対応メモ（ほいさぽ販売管理ダッシュボードとの統合）

相手チームの契約書 `integration_sales_task_app.md` に対する、**こちら（営業タスク管理アプリ＝提供側）の対応状況**。
現段階では統合しない。相手アプリには一切変更を加えない。本書は「後で滑らかに繋ぐための準備」を記録する。

公開URL: https://smizumoto-arch.github.io/team-dashboard/

---

## 対応済み（このアプリに実装した）

| 契約項目 | 対応 |
|---|---|
| Firebase プロジェクト共有 `hoisapo-pj` | ✅ 既に使用 |
| Google 認証 + ドメイン制限 | ✅ `Googleでログイン`を主に。`@ito-kyozaisha.co.jp`/`@codmono.com` 以外は自動ログアウト（`AuthContext` + `contract.isAllowedEmail`）。※当面メール/パスワードも保険で残置 |
| 識別キー = email（小文字） | ✅ メンバーに email を保持（`meta/app.memberEmails`）。`contract.normalizeEmail` で正規化 |
| 5名の名簿（表示名↔email） | ✅ `src/integration/contract.js` の `TEAM_ROSTER` に固定。初期メンバーとして投入 |
| 語彙の固定（priority/status/日付） | ✅ `contract.js` に変換表（`高↔high` 等／`未着手↔open` 等／日付は `YYYY-MM-DD`） |
| モードA：ダッシュボードURL | ✅ `/`・`/dashboard` 両方で表示。`?from=hoisapo` で本人タブを自動表示（SSO要件の先取り） |
| ディープリンク `#/tasks/:id` | ✅ ルート追加。該当タスクの編集を開く |
| task-summary を生成する純粋関数 | ✅ `contract.buildTaskSummary()` を用意（将来のAPIがそのまま再利用可能） |

---

## 未対応（統合フェーズで実施。今はやらない）

### ① モードB API（`GET /api/external/task-summary`）— **バックエンドが必須**
- GitHub Pages は静的ホスティングのため **サーバーAPIを置けない**。
- 必要なもの：**Firebase Admin SDK が使えるサーバー**（推奨：`hoisapo-pj` の **Cloud Functions for Firebase**、または Cloud Run）。
- 処理の流れ（実装イメージ）:
  1. ほいさぽのサーバーから `?email=` 付きで呼ばれる（サーバー間認証：Cloud Run サービス間 ID トークン or `X-Api-Key`）。
  2. 受け手は email → Firebase Auth で uid 解決（`admin.auth().getUserByEmail`）。
  3. `users/{uid}/tasks` を Admin 権限で取得（※クライアントのFirestoreルールは本人のみ＝正しくブロックされるので、Adminが必要）。
  4. `contract.buildTaskSummary(tasks, { email, displayName, baseUrl })` で §5.2 のJSONを返す。
- これにより、UIとAPIの**語彙・形が `contract.js` で完全一致**する。

### ② 「本人のタスク」をどこに置くか（要・両チーム合意）
- 現状は **per-user**（`users/{uid}/tasks`）。各人が自分のアカウントでログインして自分のタスクを管理する形なら、email→uid→tasks で①がそのまま成立（SSOも自然）。
- もし「マネージャー1人が全員分を集中管理」する運用にするなら、データは**共有領域**（例 `teams/{teamId}/tasks` ＋ `assigneeEmail`）へ移し、ルールとAPIをそれに合わせる必要がある。
- **どちらの運用にするかが、①の実装方法を左右する**。統合着手前に決める。

### ③ ドメイン制限のサーバー側強化
- 今はクライアント側でドメインチェック（データは本人領域のみなので漏洩はしない）。本番はFirestoreルール/サーバー側でも担保する。

---

## ほいさぽ側に渡す値（統合時）
- `SALES_TASK_APP_URL` = `https://smizumoto-arch.github.io/team-dashboard/`（モードA）
- `SALES_TASK_API_BASE` = （①のCloud Functions等のURL。未定）
- 認証（①）= Cloud Run サービス間 audience か `SALES_TASK_API_KEY`

## 関連ファイル
- `src/integration/contract.js` … 契約の単一の真実（ドメイン/名簿/語彙/summary生成）
- `src/auth/AuthContext.jsx` … Google認証 + ドメイン制限
- `src/components/Dashboard.jsx` … メンバー(email付き)・タスク・行動指針・`?from=hoisapo`・`#/tasks/:id`
