// ============================================================
// ダッシュボード本体
//   ・メンバー動的管理（表示名 + 連携キーemail）
//   ・タスク編集モーダル / 担当者変更で自動移動
//   ・2週間の行動指針バナー
//   ・連携対応：?from=hoisapo で本人タブを自動表示 / #/tasks/:id ディープリンク
// ------------------------------------------------------------
// Firestore:
//   users/{uid}/tasks/{taskId}  { name, assignee, due, status, priority, createdAt }
//   users/{uid}/meta/app        { seeded, members:string[], memberEmails:{name:email}, guideline }
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, getDocs, getDoc, setDoc, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import {
  LayoutDashboard, Layers, List, Plus, PlusCircle, Calendar, CalendarDays,
  Trash2, AlertCircle, AlertTriangle, CheckCircle2, Loader, ListTodo, Users,
  Building2, HelpCircle, ChevronsUp, ChevronUp, ChevronDown, Inbox, LogOut,
  Pencil, X, UserCog, Save, Target, Mail,
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthContext';
import { TEAM_ROSTER, normalizeEmail } from '../integration/contract';

/* ===================== 定数・マスタ ===================== */
// 連携仕様の5名を初期メンバーに（表示名 + 連携キーemail）
const DEFAULT_MEMBERS = TEAM_ROSTER.map((r) => r.name);
const DEFAULT_MEMBER_EMAILS = Object.fromEntries(TEAM_ROSTER.map((r) => [r.name, r.email]));
const SPECIAL = ['全体', '未定'];

const SPECIAL_ACCENT = { '全体': 'bg-violet-500', '未定': 'bg-slate-400' };
const MEMBER_PALETTE = [
  'bg-indigo-500', 'bg-teal-500', 'bg-fuchsia-500', 'bg-sky-500',
  'bg-rose-500', 'bg-emerald-500', 'bg-orange-500', 'bg-cyan-500',
];

const STATUSES = ['未着手', '進行中', '完了'];
const STATUS_STYLE = {
  '未着手': { badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200', dot: 'bg-slate-400' },
  '進行中': { badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', dot: 'bg-blue-500' },
  '完了':   { badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
};

const PRIORITIES = ['高', '中', '低'];
const PRIORITY_STYLE = {
  '高': { badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200', Icon: ChevronsUp },
  '中': { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', Icon: ChevronUp },
  '低': { badge: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200', Icon: ChevronDown },
};
const PRIORITY_ORDER = { '高': 0, '中': 1, '低': 2 };

const SEED_TASKS = [
  { name: '新規見込み顧客リストの作成',        assignee: '伊東 靖記', due: '2026-06-18', status: '進行中', priority: '高' },
  { name: 'A社 提案書の最終チェック',          assignee: '伊東 靖記', due: '2026-06-17', status: '未着手', priority: '高' },
  { name: '週次レポート提出',                  assignee: '伊東 靖記', due: '2026-06-19', status: '未着手', priority: '中' },
  { name: 'B社 契約更新の打ち合わせ',          assignee: '杉本 鉄馬', due: '2026-06-15', status: '完了',   priority: '中' },
  { name: '展示会フォローアップメール送信',    assignee: '杉本 鉄馬', due: '2026-06-16', status: '進行中', priority: '高' },
  { name: 'C社 見積もり再作成',                assignee: '杉本 鉄馬', due: '2026-06-20', status: '未着手', priority: '中' },
  { name: 'CRMデータ更新',                     assignee: '水元 駿生', due: '2026-06-22', status: '未着手', priority: '低' },
  { name: '月次目標の振り返り資料',            assignee: '水元 駿生', due: '2026-06-14', status: '完了',   priority: '中' },
  { name: 'D社 デモ準備',                      assignee: '水元 駿生', due: '2026-06-18', status: '進行中', priority: '高' },
  { name: '問い合わせ一次対応',                assignee: '内藤 晋一', due: '2026-06-16', status: '進行中', priority: '中' },
  { name: '競合製品の調査メモ',                assignee: '内藤 晋一', due: '2026-06-25', status: '未着手', priority: '低' },
  { name: '請求書発行依頼',                    assignee: '大橋 康史', due: '2026-06-13', status: '完了',   priority: '低' },
  { name: '事業部 月次キックオフMTGの準備',   assignee: '全体', due: '2026-06-19', status: '進行中', priority: '高' },
  { name: '下半期 部門予算の見直し資料作成',  assignee: '全体', due: '2026-06-24', status: '未着手', priority: '中' },
  { name: '営業ナレッジ共有ドキュメント整備', assignee: '全体', due: '2026-06-30', status: '未着手', priority: '低' },
  { name: '新規問い合わせ（X社）の担当割当',  assignee: '未定', due: '2026-06-17', status: '未着手', priority: '高' },
  { name: '展示会で獲得したリードの仕分け',    assignee: '未定', due: '2026-06-20', status: '未着手', priority: '中' },
  { name: 'クレーム対応（Y社）の一次受付',    assignee: '未定', due: '2026-06-16', status: '進行中', priority: '高' },
];

/* ===================== ヘルパー ===================== */
function buildAccentMap(members) {
  const map = { ...SPECIAL_ACCENT };
  members.forEach((name, i) => { map[name] = MEMBER_PALETTE[i % MEMBER_PALETTE.length]; });
  return map;
}
function avatarShort(name) {
  if (!name) return '?';
  if (name === '全体') return '全';
  if (name === '未定') return '?';
  const chars = Array.from(name.replace(/\s/g, ''));
  return chars[chars.length - 1];
}
function isOverdue(due, status) {
  if (status === '完了') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(due) < today;
}
function fmtDate(d) {
  const dt = new Date(d);
  return (dt.getMonth() + 1) + '/' + dt.getDate();
}

/* ===================== 小物 ===================== */
function Avatar({ name, accentMap, size = 24, text = 'text-xs' }) {
  const accent = (accentMap && accentMap[name]) || 'bg-slate-400';
  return (
    <span className={'rounded-full text-white flex items-center justify-center font-semibold shrink-0 ' + accent + ' ' + text}
      style={{ width: size, height: size }}>
      {avatarShort(name)}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ' + s.badge}>
      <span className={'w-1.5 h-1.5 rounded-full ' + s.dot} />
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const p = PRIORITY_STYLE[priority];
  const I = p.Icon;
  return (
    <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ' + p.badge}>
      <I size={13} />{priority}
    </span>
  );
}

function ProgressBar({ done, total, color = 'from-emerald-400 to-emerald-500' }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1 text-xs text-slate-500">
        <span>{done} / {total} 完了</span>
        <span className="font-semibold text-slate-700">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={'h-full rounded-full bg-gradient-to-r transition-all duration-500 ' + color} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, icon, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">{icon}{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ===================== 行動指針バナー（最上部） ===================== */
function GuidelineBanner({ text, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(text || ''); }, [text]);

  const save = async () => {
    setSaving(true);
    try { await onSave(draft); setEditing(false); } finally { setSaving(false); }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-indigo-100 text-sm font-semibold">
            <Target size={18} /> 次の2週間の行動指針
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-md transition-colors">
              <Pencil size={13} /> 編集
            </button>
          )}
        </div>
        {editing ? (
          <div className="mt-3">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3}
              placeholder="例：今期は既存顧客の深耕を最優先。各自、上位3社へ訪問アポを今週中に設定する。"
              className="w-full rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-white/70" />
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => { setDraft(text || ''); setEditing(false); }}
                className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20">キャンセル</button>
              <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-white text-indigo-700 font-medium hover:bg-indigo-50 disabled:opacity-60">
                <Save size={13} /> 保存
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1.5 text-base sm:text-lg font-medium leading-relaxed whitespace-pre-wrap">
            {text ? text : <span className="text-indigo-200 text-sm font-normal">まだ設定されていません。「編集」から今期の方針を入力してください。</span>}
          </p>
        )}
      </div>
    </div>
  );
}

/* ===================== タスク行・テーブル ===================== */
function TaskRow({ task, assignees, accentMap, onStatusChange, onAssigneeChange, onEdit, onDelete, showAssignee }) {
  const overdue = isOverdue(task.due, task.status);
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
      <td className="py-3 px-4"><div className="font-medium text-slate-800">{task.name}</div></td>
      {showAssignee && (
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Avatar name={task.assignee} accentMap={accentMap} />
            <select value={task.assignee} onChange={(e) => onAssigneeChange(task.id, e.target.value)} title="担当者を変更"
              className="text-xs border border-slate-200 rounded-md px-1.5 py-1 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer">
              {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </td>
      )}
      <td className="py-3 px-4 whitespace-nowrap">
        <span className={'inline-flex items-center gap-1.5 text-sm ' + (overdue ? 'text-rose-600 font-semibold' : 'text-slate-600')}>
          <Calendar size={14} />{fmtDate(task.due)}
          {overdue && <AlertCircle size={14} className="text-rose-500" />}
        </span>
      </td>
      <td className="py-3 px-4"><PriorityBadge priority={task.priority} /></td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={task.status} />
          <select value={task.status} onChange={(e) => onStatusChange(task.id, e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-1.5 py-1 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer">
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </td>
      <td className="py-3 px-4 text-right whitespace-nowrap">
        <button onClick={() => onEdit(task)} className="text-slate-300 hover:text-indigo-500 transition-colors p-1 rounded" title="編集"><Pencil size={16} /></button>
        <button onClick={() => onDelete(task.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded ml-1" title="削除"><Trash2 size={16} /></button>
      </td>
    </tr>
  );
}

function TaskTable(props) {
  const { tasks, showAssignee, emptyText = 'タスクはありません' } = props;
  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <div className="flex justify-center mb-3"><Inbox size={40} className="text-slate-300" /></div>
        {emptyText}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-200">
            <th className="py-2.5 px-4 font-medium">タスク名</th>
            {showAssignee && <th className="py-2.5 px-4 font-medium">担当者</th>}
            <th className="py-2.5 px-4 font-medium">期限</th>
            <th className="py-2.5 px-4 font-medium">優先度</th>
            <th className="py-2.5 px-4 font-medium">ステータス</th>
            <th className="py-2.5 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} assignees={props.assignees} accentMap={props.accentMap}
              onStatusChange={props.onStatusChange} onAssigneeChange={props.onAssigneeChange}
              onEdit={props.onEdit} onDelete={props.onDelete} showAssignee={showAssignee} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ===================== 追加フォーム ===================== */
function AddTaskForm({ fixedAssignee, onAdd, title, accentBtn = 'bg-indigo-600 hover:bg-indigo-700' }) {
  const [name, setName] = useState('');
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState('中');
  const [status, setStatus] = useState('未着手');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onAdd({ name: name.trim(), assignee: fixedAssignee, due: due || '2026-06-30', status, priority });
    setName(''); setDue(''); setPriority('中'); setStatus('未着手');
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
        <PlusCircle size={18} className="text-indigo-500" />{title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5">
          <label className="block text-xs text-slate-400 mb-1">タスク名</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：A社へ提案書を送付"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs text-slate-400 mb-1">期限</label>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">優先度</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">状態</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button type="submit" className={'inline-flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm ' + accentBtn}>
          <Plus size={16} />追加する
        </button>
      </div>
    </form>
  );
}

/* ===================== タスク編集モーダル ===================== */
function TaskEditModal({ task, assignees, onSave, onClose }) {
  const [name, setName] = useState(task.name);
  const [assignee, setAssignee] = useState(task.assignee);
  const [due, setDue] = useState(task.due);
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave(task.id, { name: name.trim(), assignee, due, priority, status }); onClose(); }
    finally { setSaving(false); }
  };
  const field = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300';

  return (
    <Modal open onClose={onClose} title="タスクを編集" icon={<Pencil size={16} className="text-indigo-500" />}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">タスク名</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">担当者</label>
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={field}>
            {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">担当者を変えて保存すると、その担当者のタブへ移動します。</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">期限</label>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">優先度</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={field}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">状態</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={field}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">キャンセル</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-60">
            <Save size={15} /> 保存する
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ===================== メンバー管理モーダル ===================== */
function MemberRow({ name, email, accentMap, onRename, onSetEmail, onDelete }) {
  const [dName, setDName] = useState(name);
  const [dEmail, setDEmail] = useState(email || '');
  useEffect(() => { setDName(name); }, [name]);
  useEffect(() => { setDEmail(email || ''); }, [email]);
  const commitName = () => { const v = dName.trim(); if (v && v !== name) onRename(name, v); };
  const commitEmail = () => { const v = dEmail.trim(); if (v !== (email || '')) onSetEmail(name, v); };
  return (
    <div className="border border-slate-100 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Avatar name={name} accentMap={accentMap} size={28} />
        <input value={dName} onChange={(e) => setDName(e.target.value)} onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        <button onClick={() => onDelete(name)} className="text-slate-300 hover:text-rose-500 p-1.5 rounded" title="削除"><Trash2 size={16} /></button>
      </div>
      <div className="relative">
        <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
        <input value={dEmail} onChange={(e) => setDEmail(e.target.value)} onBlur={commitEmail}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
          placeholder="連携キー：メールアドレス（任意）"
          className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      </div>
    </div>
  );
}

function MemberManagerModal({ members, memberEmails, accentMap, onAdd, onRename, onSetEmail, onDelete, onClose }) {
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const add = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onAdd(newName.trim(), newEmail.trim());
    setNewName(''); setNewEmail('');
  };
  return (
    <Modal open onClose={onClose} title="メンバー管理" icon={<UserCog size={16} className="text-indigo-500" />}>
      <p className="text-[11px] text-slate-400 mb-3">メールアドレスは、ほいさぽ等との連携キー（本人特定）になります。</p>
      <div className="space-y-2">
        {members.map((m) => (
          <MemberRow key={m} name={m} email={memberEmails[m]} accentMap={accentMap}
            onRename={onRename} onSetEmail={onSetEmail} onDelete={onDelete} />
        ))}
        {members.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">メンバーがいません。下から追加してください。</p>}
      </div>
      <form onSubmit={add} className="mt-5 pt-4 border-t border-slate-100 space-y-2">
        <label className="block text-xs text-slate-400">新しいメンバーを追加</label>
        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="表示名（例：山田 太郎）"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        <div className="flex gap-2">
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="メール（任意）"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <button type="submit" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg">
            <Plus size={15} /> 追加
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ===================== サマリー・進捗・サブタブ ===================== */
function SummaryCards({ tasks }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === '完了').length;
  const inProgress = tasks.filter((t) => t.status === '進行中').length;
  const overdue = tasks.filter((t) => isOverdue(t.due, t.status)).length;
  const cards = [
    { label: '総タスク数', value: total, Icon: ListTodo, color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: '進行中', value: inProgress, Icon: Loader, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '完了', value: done, Icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: '期限超過', value: overdue, Icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const I = c.Icon;
        return (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
            <div className={'w-11 h-11 rounded-lg flex items-center justify-center ' + c.bg}><I size={22} className={c.color} /></div>
            <div>
              <div className="text-2xl font-bold text-slate-800 leading-none">{c.value}</div>
              <div className="text-xs text-slate-400 mt-1">{c.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MemberProgress({ tasks, members, accentMap }) {
  const groups = [...members, '全体', '未定'];
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
        <Users size={18} className="text-indigo-500" /> 担当者別 進捗状況
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {groups.map((g) => {
          const mt = tasks.filter((t) => t.assignee === g);
          const done = mt.filter((t) => t.status === '完了').length;
          const color = g === '未定' ? 'from-slate-300 to-slate-400' : 'from-emerald-400 to-emerald-500';
          return (
            <div key={g} className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-3">
                <Avatar name={g} accentMap={accentMap} size={28} />
                <span className="font-medium text-slate-700 text-sm truncate">{g}</span>
                {g === '未定' && mt.length > 0 && (
                  <span className="ml-auto text-[11px] text-amber-600 bg-amber-50 ring-1 ring-amber-200 px-1.5 py-0.5 rounded shrink-0">要割当 {mt.length}</span>
                )}
              </div>
              <ProgressBar done={done} total={mt.length} color={color} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubTabs({ current, onChange, counts }) {
  const items = [
    { key: 'all', label: '全員のタスク', Icon: Layers, count: counts.all },
    { key: 'team', label: '全体タスク', Icon: Building2, count: counts.team },
    { key: 'unassigned', label: '未定タスク', Icon: HelpCircle, count: counts.unassigned },
  ];
  return (
    <div className="inline-flex bg-slate-100 p-1 rounded-xl">
      {items.map((it) => {
        const active = current === it.key;
        const isUn = it.key === 'unassigned';
        const I = it.Icon;
        return (
          <button key={it.key} onClick={() => onChange(it.key)}
            className={'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (active ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}>
            <I size={15} className={active ? (isUn ? 'text-amber-500' : 'text-indigo-500') : 'text-slate-400'} />
            {it.label}
            <span className={'text-xs px-1.5 py-0.5 rounded-full ' + (active ? (isUn ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700') : 'bg-slate-200 text-slate-500')}>{it.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ===================== 本体 ===================== */
export default function Dashboard() {
  const { user, logout } = useAuth();
  const { taskId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState(DEFAULT_MEMBERS);
  const [memberEmails, setMemberEmails] = useState(DEFAULT_MEMBER_EMAILS);
  const [guideline, setGuideline] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('全体');
  const [overviewSub, setOverviewSub] = useState('all');
  const [editingTask, setEditingTask] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [autoFocused, setAutoFocused] = useState(false);

  const uid = user?.uid;
  const metaRef = () => doc(db, 'users', uid, 'meta', 'app');

  // タスク購読
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      collection(db, 'users', uid, 'tasks'),
      (snap) => { setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (err) => { console.error('[tasks onSnapshot]', err); setLoading(false); }
    );
    return unsub;
  }, [uid]);

  // 設定（メンバー・email・行動指針）購読
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'users', uid, 'meta', 'app'), (snap) => {
      const d = snap.exists() ? snap.data() : {};
      setMembers(Array.isArray(d.members) && d.members.length ? d.members : DEFAULT_MEMBERS);
      setMemberEmails(d.memberEmails && typeof d.memberEmails === 'object' ? d.memberEmails : DEFAULT_MEMBER_EMAILS);
      setGuideline(typeof d.guideline === 'string' ? d.guideline : '');
    });
    return unsub;
  }, [uid]);

  // 初回サンプル投入
  useEffect(() => {
    if (!uid) return;
    const seedIfEmpty = async () => {
      const ref = doc(db, 'users', uid, 'meta', 'app');
      const metaSnap = await getDoc(ref);
      if (metaSnap.exists() && metaSnap.data().seeded) return;
      const tasksSnap = await getDocs(collection(db, 'users', uid, 'tasks'));
      if (!tasksSnap.empty) {
        await setDoc(ref, { seeded: true, members: DEFAULT_MEMBERS, memberEmails: DEFAULT_MEMBER_EMAILS }, { merge: true });
        return;
      }
      const batch = writeBatch(db);
      SEED_TASKS.forEach((t) => {
        const tref = doc(collection(db, 'users', uid, 'tasks'));
        batch.set(tref, { ...t, createdAt: serverTimestamp() });
      });
      batch.set(ref, { seeded: true, members: DEFAULT_MEMBERS, memberEmails: DEFAULT_MEMBER_EMAILS, guideline: '' }, { merge: true });
      await batch.commit();
    };
    seedIfEmpty().catch((e) => console.error('[seed]', e));
  }, [uid]);

  // アクティブタブの整合性
  useEffect(() => {
    if (activeTab !== '全体' && !members.includes(activeTab)) setActiveTab('全体');
  }, [members, activeTab]);

  // 連携：?from=hoisapo で来たら、ログイン中ユーザーの本人タブを自動表示（SSO要件）
  useEffect(() => {
    if (autoFocused || !user?.email) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('from') !== 'hoisapo') return;
    const me = normalizeEmail(user.email);
    const mine = members.find((m) => normalizeEmail(memberEmails[m]) === me);
    if (mine) { setActiveTab(mine); setAutoFocused(true); }
  }, [user, members, memberEmails, autoFocused]);

  // ディープリンク：#/tasks/:id で来たら該当タスクの編集を開く
  useEffect(() => {
    if (!taskId || !tasks.length) return;
    const t = tasks.find((x) => x.id === taskId);
    if (t) setEditingTask(t);
  }, [taskId, tasks]);

  const accentMap = useMemo(() => buildAccentMap(members), [members]);
  const assignees = useMemo(() => ['全体', ...members, '未定'], [members]);

  // タスク CRUD
  const addTask = (t) => addDoc(collection(db, 'users', uid, 'tasks'), { ...t, createdAt: serverTimestamp() });
  const changeStatus = (id, status) => updateDoc(doc(db, 'users', uid, 'tasks', id), { status });
  const changeAssignee = (id, assignee) => updateDoc(doc(db, 'users', uid, 'tasks', id), { assignee });
  const updateTask = (id, patch) => updateDoc(doc(db, 'users', uid, 'tasks', id), patch);
  const deleteTask = (id) => deleteDoc(doc(db, 'users', uid, 'tasks', id));

  // 行動指針
  const saveGuideline = (text) => setDoc(metaRef(), { guideline: text, guidelineUpdatedAt: serverTimestamp() }, { merge: true });

  // メンバー管理（emailも同時に保持）
  const addMember = async (name, email) => {
    if (members.includes(name) || SPECIAL.includes(name)) { alert('同じ名前、または予約語（全体／未定）は使えません。'); return; }
    const nextEmails = { ...memberEmails };
    if (email) nextEmails[name] = email;
    await setDoc(metaRef(), { members: [...members, name], memberEmails: nextEmails }, { merge: true });
  };
  const setMemberEmail = (name, email) => setDoc(metaRef(), { memberEmails: { ...memberEmails, [name]: email } }, { merge: true });
  const renameMember = async (oldName, newName) => {
    if (members.includes(newName) || SPECIAL.includes(newName)) { alert('同じ名前、または予約語（全体／未定）は使えません。'); return; }
    const newMembers = members.map((m) => (m === oldName ? newName : m));
    const nextEmails = { ...memberEmails };
    if (oldName in nextEmails) { nextEmails[newName] = nextEmails[oldName]; delete nextEmails[oldName]; }
    const batch = writeBatch(db);
    batch.set(metaRef(), { members: newMembers, memberEmails: nextEmails }, { merge: true });
    tasks.filter((t) => t.assignee === oldName).forEach((t) => batch.update(doc(db, 'users', uid, 'tasks', t.id), { assignee: newName }));
    await batch.commit();
    if (activeTab === oldName) setActiveTab(newName);
  };
  const deleteMember = async (name) => {
    const cnt = tasks.filter((t) => t.assignee === name).length;
    if (!confirm(`「${name}」を削除します。${cnt > 0 ? `担当タスク${cnt}件は「未定」へ移動します。` : ''}よろしいですか？`)) return;
    const newMembers = members.filter((m) => m !== name);
    const nextEmails = { ...memberEmails };
    delete nextEmails[name];
    const batch = writeBatch(db);
    batch.set(metaRef(), { members: newMembers, memberEmails: nextEmails }, { merge: true });
    tasks.filter((t) => t.assignee === name).forEach((t) => batch.update(doc(db, 'users', uid, 'tasks', t.id), { assignee: '未定' }));
    await batch.commit();
    if (activeTab === name) setActiveTab('全体');
  };

  const sortTasks = (arr) => [...arr].sort((a, b) => {
    if ((a.status === '完了') !== (b.status === '完了')) return a.status === '完了' ? 1 : -1;
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return new Date(a.due) - new Date(b.due);
  });

  const counts = {
    all: tasks.length,
    team: tasks.filter((t) => t.assignee === '全体').length,
    unassigned: tasks.filter((t) => t.assignee === '未定').length,
  };

  const visibleTasks = useMemo(() => {
    let filtered;
    if (activeTab === '全体') {
      if (overviewSub === 'team') filtered = tasks.filter((t) => t.assignee === '全体');
      else if (overviewSub === 'unassigned') filtered = tasks.filter((t) => t.assignee === '未定');
      else filtered = tasks;
    } else {
      filtered = tasks.filter((t) => t.assignee === activeTab);
    }
    return sortTasks(filtered);
  }, [tasks, activeTab, overviewSub]);

  const tabs = ['全体', ...members];
  const todayLabel = (() => { const d = new Date(); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; })();

  const tableProps = {
    assignees, accentMap,
    onStatusChange: changeStatus, onAssigneeChange: changeAssignee,
    onEdit: setEditingTask, onDelete: deleteTask,
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <GuidelineBanner text={guideline} onSave={saveGuideline} />

      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
              <LayoutDashboard size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-none">チームタスク管理</h1>
              <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays size={16} /><span>{todayLabel}</span>
            </div>
            <button onClick={() => setShowMembers(true)}
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 px-3 py-2 rounded-lg transition-colors">
              <UserCog size={16} /><span className="hidden sm:inline">メンバー管理</span>
            </button>
            <button onClick={() => { if (confirm('ログアウトしますか？')) logout(); }}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-rose-500 border border-slate-200 hover:border-rose-200 px-3 py-2 rounded-lg transition-colors">
              <LogOut size={16} /><span className="hidden sm:inline">ログアウト</span>
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const active = activeTab === tab;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' + (active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')}>
                  <span className="inline-flex items-center gap-1.5">
                    {tab === '全体' ? <Layers size={15} /> : <Avatar name={tab} accentMap={accentMap} size={17} text="text-[9px]" />}
                    {tab}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="text-center py-24 text-slate-400 flex flex-col items-center gap-3">
            <Loader size={28} className="animate-spin text-indigo-400" />読み込み中...
          </div>
        ) : activeTab === '全体' ? (
          <>
            <SummaryCards tasks={tasks} />
            <MemberProgress tasks={tasks} members={members} accentMap={accentMap} />
            <SubTabs current={overviewSub} onChange={setOverviewSub} counts={counts} />

            {overviewSub === 'all' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <List size={18} className="text-indigo-500" />
                  <h3 className="text-sm font-semibold text-slate-700">全員のタスク一覧（すべて）</h3>
                  <span className="ml-auto text-xs text-slate-400">{visibleTasks.length}件</span>
                </div>
                <TaskTable tasks={visibleTasks} showAssignee {...tableProps} />
              </div>
            )}

            {overviewSub === 'team' && (
              <>
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-start gap-3">
                  <Building2 size={20} className="text-violet-600 mt-0.5" />
                  <p className="text-sm text-violet-800">特定の個人ではなく、<span className="font-semibold">事業部・チーム全体</span>で取り組むタスクです。</p>
                </div>
                <AddTaskForm fixedAssignee="全体" onAdd={addTask} title="「全体」タスクを追加" accentBtn="bg-violet-600 hover:bg-violet-700" />
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Building2 size={18} className="text-violet-500" />
                    <h3 className="text-sm font-semibold text-slate-700">全体タスク一覧</h3>
                    <span className="ml-auto text-xs text-slate-400">{visibleTasks.length}件</span>
                  </div>
                  <TaskTable tasks={visibleTasks} showAssignee {...tableProps} emptyText="全体タスクはまだありません" />
                </div>
              </>
            )}

            {overviewSub === 'unassigned' && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <HelpCircle size={20} className="text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-800">担当者が決まっていないタスクです。一覧の<span className="font-semibold">「担当者」欄</span>から各メンバーへ割り当てられます。</p>
                </div>
                <AddTaskForm fixedAssignee="未定" onAdd={addTask} title="「未定」タスクを追加" accentBtn="bg-amber-500 hover:bg-amber-600" />
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <HelpCircle size={18} className="text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-700">未定タスク一覧（要割当）</h3>
                    <span className="ml-auto text-xs text-slate-400">{visibleTasks.length}件</span>
                  </div>
                  <TaskTable tasks={visibleTasks} showAssignee {...tableProps} emptyText="未定のタスクはありません 🎉" />
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={activeTab} accentMap={accentMap} size={40} text="text-sm" />
                <div>
                  <h2 className="font-bold text-slate-800">{activeTab} さんのタスク</h2>
                  <p className="text-xs text-slate-400">{memberEmails[activeTab] || '担当タスクの進捗'}</p>
                </div>
              </div>
              <ProgressBar
                done={tasks.filter((t) => t.assignee === activeTab && t.status === '完了').length}
                total={tasks.filter((t) => t.assignee === activeTab).length}
              />
            </div>

            <AddTaskForm fixedAssignee={activeTab} onAdd={addTask} title={activeTab + ' の新しいタスクを追加'} />

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <List size={18} className="text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-700">{activeTab} のタスク一覧</h3>
                <span className="ml-auto text-xs text-slate-400">{visibleTasks.length}件</span>
              </div>
              <TaskTable tasks={visibleTasks} showAssignee={false} {...tableProps} />
            </div>
          </>
        )}

        <footer className="text-center text-xs text-slate-300 pt-2 pb-6">
          チームタスク管理ダッシュボード — Firebase 連携版
        </footer>
      </main>

      {editingTask && (
        <TaskEditModal task={editingTask} assignees={assignees} onSave={updateTask} onClose={() => setEditingTask(null)} />
      )}
      {showMembers && (
        <MemberManagerModal
          members={members} memberEmails={memberEmails} accentMap={accentMap}
          onAdd={addMember} onRename={renameMember} onSetEmail={setMemberEmail} onDelete={deleteMember}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  );
}
