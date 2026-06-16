// ============================================================
// ステップ1: Firebase 初期化
// ------------------------------------------------------------
// Firebase Modular SDK (v9+) を使用。
// 設定値は .env の VITE_FIREBASE_* から読み込みます（直書き禁止）。
// ============================================================
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// アプリ初期化（既存プロジェクト hoisapo-pj を使用）
const app = initializeApp(firebaseConfig);

// 各サービスのインスタンスをエクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
