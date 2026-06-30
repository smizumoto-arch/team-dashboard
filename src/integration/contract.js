// ============================================================
// 連携契約（integration_sales_task_app.md に対応する単一の真実）
// ------------------------------------------------------------
// このファイルは「ほいさぽ（消費側）」との契約を1か所に集約したもの。
// ・許可ドメイン / 識別キー(email) / 5名の名簿
// ・語彙マッピング（アプリ内=日本語 ⇔ 契約=英語）
// ・将来のモードB API レスポンス（§5.2）を生成する純粋関数
//   → Cloud Functions 等のバックエンドからも import して同じ形を返せる
// ============================================================

/* ---- 許可ドメイン / 識別キー（§2, §3） ---- */
export const ALLOWED_EMAIL_DOMAINS = ['ito-kyozaisha.co.jp', 'codmono.com'];

export function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}
export function isAllowedEmail(email) {
  const e = normalizeEmail(email);
  const domain = e.split('@')[1];
  return !!domain && ALLOWED_EMAIL_DOMAINS.includes(domain);
}

/* ---- 営業担当 5名（表示名 ↔ 連携キー email）（§3 の対応表） ---- */
// ⚠️ 識別キーは必ず Google ログインの email。伊東さんだけ codmono.com なので注意。
export const TEAM_ROSTER = [
  { name: '伊東 靖記', email: 'yasunori.ito@codmono.com' },
  { name: '杉本 鉄馬', email: 't.sugimoto@ito-kyozaisha.co.jp' },
  { name: '水元 駿生', email: 's.mizumoto@ito-kyozaisha.co.jp' },
  { name: '内藤 晋一', email: 's.naito@ito-kyozaisha.co.jp' },
  { name: '大橋 康史', email: 'y.ohashi@ito-kyozaisha.co.jp' },
];

/* ---- 語彙マッピング（§5.2 / §7） ---- */
export const PRIORITY_TO_CONTRACT = { 高: 'high', 中: 'normal', 低: 'low' };
export const STATUS_TO_CONTRACT = { 未着手: 'open', 進行中: 'in_progress', 完了: 'done' };
export const PRIORITY_FROM_CONTRACT = { high: '高', normal: '中', low: '低' };
export const STATUS_FROM_CONTRACT = { open: '未着手', in_progress: '進行中', done: '完了' };

/* ---- 日付（YYYY-MM-DD） ---- */
export function todayStr(d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/* ---- タスク1件 → 契約形式（§5.2 topTasks[]） ---- */
// task: { id, name, due, priority(日本語), status(日本語) }
export function toContractTask(task, baseUrl) {
  return {
    id: task.id,
    title: task.name,
    dueDate: task.due || null, // YYYY-MM-DD
    priority: PRIORITY_TO_CONTRACT[task.priority] || 'normal',
    status: STATUS_TO_CONTRACT[task.status] || 'open',
    url: `${baseUrl}#/tasks/${task.id}`, // 絶対URL（ディープリンク）
  };
}

/* ---- タスク配列 → task-summary レスポンス（§5.2 全体） ----
 * userTasks: 対象ユーザー本人のタスク配列（日本語ステータスのまま）
 * opts: { email, displayName, baseUrl }
 * ※ この関数は将来のバックエンド（Cloud Functions 等）から再利用する想定。
 */
export function buildTaskSummary(userTasks, { email, displayName, baseUrl }) {
  const t = todayStr();
  const open = userTasks.filter((x) => x.status !== '完了');
  const priorityRank = { 高: 0, 中: 1, 低: 2 };

  const topTasks = [...open]
    .sort((a, b) => {
      const p = (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
      if (p !== 0) return p;
      return String(a.due || '').localeCompare(String(b.due || ''));
    })
    .slice(0, 5)
    .map((x) => toContractTask(x, baseUrl));

  return {
    user: { email: normalizeEmail(email), displayName: displayName || null },
    summary: {
      openCount: open.length,
      dueTodayCount: open.filter((x) => x.due === t).length,
      overdueCount: open.filter((x) => x.due && x.due < t).length,
      completedThisWeek: 0, // 任意項目。完了日を保持していないため将来対応。
    },
    topTasks,
    dashboardUrl: `${baseUrl}#/dashboard`,
  };
}
