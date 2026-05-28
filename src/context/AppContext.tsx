import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lang, translations, Translations } from '../i18n';

interface User {
  username: string;
  email: string;
  hwid: string;
  uid: number;
  regDate: string;
  subscription: {
    plan: string;
    status: string;
    expiresAt: string;
  };
  stats: {
    sessions: number;
    hoursPlayed: number;
    configsSaved: number;
    serversPlayed: number;
    lastSession: string;
  };
  twoFactor: boolean;
  configs: any[];
  activity: number[];
  rewardCount: number;
  lastRewardAt: string;
}

interface AppContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
  user: User | null;
  login: (username: string, password: string, firebaseData?: any) => boolean;
  register: (username: string, email: string, password: string, firebaseData?: any) => boolean;
  logout: () => void;
  page: 'home' | 'profile';
  setPage: (p: 'home' | 'profile') => void;
  showAuth: 'login' | 'register' | null;
  setShowAuth: (v: 'login' | 'register' | null) => void;
  showPurchase: boolean;
  setShowPurchase: (v: boolean) => void;
  purchaseSubscription: (plan: 'month' | 'year' | 'lifetime') => void;
  applySubscriptionKey: (key: string) => Promise<{ ok: boolean; message: string }>;
  downloadLoader: () => void;
  spinRoulette: (days: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

function generateHWID() {
  const chars = 'ABCDEF0123456789';
  const parts = [];
  for (let i = 0; i < 4; i++) {
    let part = '';
    for (let j = 0; j < 4; j++) {
      part += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(part);
  }
  return parts.join('-');
}

function getNextUID(): number {
  const current = parseInt(localStorage.getItem('rainclient_uid_counter') || '0', 10);
  const next = current + 1;
  localStorage.setItem('rainclient_uid_counter', next.toString());
  return next;
}

const PLAN_DAYS: Record<string, number> = {
  week: 7,
  '7days': 7,
  '7_days': 7,
  '7': 7,
  month: 30,
  '30days': 30,
  '30_days': 30,
  '30': 30,
  halfyear: 180,
  half_year: 180,
  halfYear: 180,
  '180days': 180,
  '180_days': 180,
  '180': 180,
  year: 365,
  '365days': 365,
  '365_days': 365,
  '365': 365,
};

function normalizePlanName(value: any, durationDays?: number | null): string {
  const raw = typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s-]+/g, '_') : '';
  if (raw === 'lifetime' || raw === 'forever' || raw === '∞' || raw === 'навсегда') return 'lifetime';
  if (raw === 'week' || raw === '7days' || raw === '7_days' || raw === '7') return 'week';
  if (raw === 'month' || raw === '30days' || raw === '30_days' || raw === '30') return 'month';
  if (raw === 'half_year' || raw === 'halfyear' || raw === 'half_yearly' || raw === '180days' || raw === '180_days' || raw === '180') return 'half_year';
  if (raw === 'year' || raw === 'yearly' || raw === 'annual' || raw === '365days' || raw === '365_days' || raw === '365') return 'year';
  if (durationDays === 7) return 'week';
  if (durationDays === 30) return 'month';
  if (durationDays === 180) return 'half_year';
  if (durationDays === 365) return 'year';
  return raw || 'none';
}

function parseFirebaseDate(value: any): string | null {
  if (!value) return null;
  if (value === '∞' || value === 'forever' || value === 'lifetime') return '∞';
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
  }
  return null;
}

function readDurationDays(data: any): number | null {
  const value =
    data?.days ??
    data?.durationDays ??
    data?.duration_days ??
    data?.validDays ??
    data?.valid_days ??
    data?.duration;

  if (typeof value === 'number' && value > 0) return value;
  if (typeof value === 'string') {
    const numeric = parseInt(value, 10);
    if (!Number.isNaN(numeric) && numeric > 0) return numeric;
  }
  return null;
}

function resolveKeyDaysAndPlan(keyData: any): { days: number | null; plan: string } {
  const nested = keyData?.subscription || {};
  const durationDays = readDurationDays(nested) || readDurationDays(keyData);
  const normalizedPlan = normalizePlanName(nested.plan || keyData?.plan, durationDays);
  if (normalizedPlan === 'lifetime') return { days: null, plan: 'lifetime' };
  if (durationDays && durationDays > 0) return { days: durationDays, plan: normalizePlanName(normalizedPlan, durationDays) };
  const fallbackDays = PLAN_DAYS[normalizedPlan];
  if (fallbackDays) return { days: fallbackDays, plan: normalizePlanName(normalizedPlan, fallbackDays) };
  return { days: null, plan: 'none' };
}

function inferPlanFromDays(days: number): string {
  if (days >= 365) return 'year';
  if (days >= 180) return 'half_year';
  if (days >= 30) return 'month';
  if (days >= 7) return 'week';
  return 'week';
}

function normalizeSubscription(firebaseData?: any): User['subscription'] {
  const subData = firebaseData?.subscription || {};
  const durationDays = readDurationDays(subData) || readDurationDays(firebaseData);
  const plan = normalizePlanName(subData.plan || firebaseData?.plan, durationDays);
  if (!plan || plan === 'none') return { plan: 'none', status: 'none', expiresAt: '-' };

  let explicitExpiry = parseFirebaseDate(subData.expiresAt || firebaseData?.expiresAt);
  const isLifetimePlan = plan === 'lifetime';
  if (explicitExpiry === '∞' && !isLifetimePlan) explicitExpiry = null;
  let expiresAt = explicitExpiry;

  if (!expiresAt && !isLifetimePlan) {
    const days = durationDays || PLAN_DAYS[plan];
    if (days) {
      const createdAt = parseFirebaseDate(subData.createdAt || firebaseData?.createdAt || subData.activatedAt || firebaseData?.activatedAt);
      const baseDate = createdAt && createdAt !== '∞' ? new Date(createdAt) : new Date();
      baseDate.setDate(baseDate.getDate() + days);
      expiresAt = baseDate.toISOString();
    }
  }

  if (!expiresAt && isLifetimePlan) expiresAt = '∞';
  if (!expiresAt || expiresAt === '∞') {
    return expiresAt === '∞'
      ? { plan, status: 'active', expiresAt }
      : { plan: 'none', status: 'none', expiresAt: '-' };
  }

  const expDate = new Date(expiresAt);
  const status: 'active' | 'expired' = expDate.getTime() < Date.now() ? 'expired' : 'active';
  return { plan, status, expiresAt };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('rainclient_lang') as Lang) || 'ru';
  });
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rainclient_user');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return {
      ...parsed,
      subscription: normalizeSubscription(parsed.subscription),
    };
  });
  const [page, setPage] = useState<'home' | 'profile'>('home');
  const [showAuth, setShowAuth] = useState<'login' | 'register' | null>(null);
  const [showPurchase, setShowPurchase] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem('rainclient_lang', lang);
  }, [lang]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('rainclient_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('rainclient_user');
    }
  }, [user]);

  // Handle returning from payment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      const pendingPlan = localStorage.getItem('pending_purchase_plan') as 'month' | 'year' | 'lifetime';
      if (pendingPlan && user) {
        // We defer it slightly to ensure everything is loaded
        setTimeout(() => {
          // NOTE: Real payment verification requires backend server
          // For now, we just show success screen without activating subscription
          // To enable real payments, you need to implement server-side payment verification
          localStorage.removeItem('pending_purchase_plan');
          setPage('profile');
          setShowPurchase(true);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 500);
      }
    } else if (urlParams.get('payment') === 'fail') {
      // Payment failed - show purchase modal with failed state
      setTimeout(() => {
        localStorage.removeItem('pending_purchase_plan');
        setShowPurchase(true);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 500);
    }
  }, [user]);

  const login = (username: string, _password: string, firebaseData?: any): boolean => {
    const saved = localStorage.getItem('rainclient_users');
    const users = saved ? JSON.parse(saved) : {};

    const subscription = normalizeSubscription(firebaseData);

    const hwid = firebaseData?.hwid || (users[username]?.hwid) || generateHWID();
    const email = firebaseData?.email || (users[username]?.email) || '';
    const rewardCount = firebaseData?.rewardCount ?? users[username]?.rewardCount ?? 0;
    const lastRewardAt = firebaseData?.lastRewardAt ?? users[username]?.lastRewardAt ?? '';

    if (users[username]) {
      users[username].hwid = hwid;
      users[username].email = email;
      users[username].subscription = subscription;
      users[username].rewardCount = rewardCount;
      users[username].lastRewardAt = lastRewardAt;
      localStorage.setItem('rainclient_users', JSON.stringify(users));
      setUser(users[username]);
      return true;
    }

    // Create new local user from Firebase data
    const now = new Date();
    const uid = getNextUID();
    const newUser: User = {
      username,
      email,
      hwid,
      uid,
      regDate: now.toISOString().split('T')[0],
      subscription,
      stats: { sessions: 0, hoursPlayed: 0, configsSaved: 0, serversPlayed: 0, lastSession: '-' },
      twoFactor: false,
      configs: [],
      activity: Array.from({ length: 7 }, () => 0),
      rewardCount: 0,
      lastRewardAt: ''
    };
    users[username] = newUser;
    localStorage.setItem('rainclient_users', JSON.stringify(users));
    setUser(newUser);
    return true;
  };

  const register = (username: string, email: string, _password: string, firebaseData?: any): boolean => {
    const saved = localStorage.getItem('rainclient_users');
    const users = saved ? JSON.parse(saved) : {};
    if (users[username]) return false;

    const now = new Date();
    const uid = getNextUID();
    const hwid = firebaseData?.hwid || generateHWID();
    const subscription = { plan: 'none', status: 'none', expiresAt: '-' };
    const newUser: User = {
      username,
      email,
      hwid,
      uid,
      regDate: now.toISOString().split('T')[0],
      subscription,
      stats: { sessions: 0, hoursPlayed: 0, configsSaved: 0, serversPlayed: 0, lastSession: '-' },
      twoFactor: false,
      configs: [],
      activity: Array.from({ length: 7 }, () => 0),
      rewardCount: 0,
      lastRewardAt: ''
    };
    users[username] = newUser;
    localStorage.setItem('rainclient_users', JSON.stringify(users));
    setUser(newUser);
    return true;
  };

  const purchaseSubscription = (plan: 'month' | 'year' | 'lifetime') => {
    if (!user) return;
    const saved = localStorage.getItem('rainclient_users');
    const users = saved ? JSON.parse(saved) : {};
    
    let expiresAt: string;
    
    if (plan === 'lifetime') {
      expiresAt = '∞';
    } else {
      const currentExpiry = user.subscription.expiresAt !== '-' 
        && user.subscription.expiresAt !== '∞'
        ? new Date(user.subscription.expiresAt) 
        : new Date();
      const isExpired = currentExpiry.getTime() < Date.now();
      const baseDate = isExpired ? new Date() : currentExpiry;
      
      if (plan === 'month') {
        baseDate.setDate(baseDate.getDate() + 30);
        expiresAt = baseDate.toISOString();
      } else if (plan === 'year') {
        baseDate.setDate(baseDate.getDate() + 365);
        expiresAt = baseDate.toISOString();
      } else {
        baseDate.setDate(baseDate.getDate() + 180);
        expiresAt = baseDate.toISOString();
      }
    }
    
    const subscription = { plan, status: 'active', expiresAt };
    const updatedUser = { ...users[user.username], subscription };
    users[user.username] = updatedUser;
    localStorage.setItem('rainclient_users', JSON.stringify(users));
    setUser(updatedUser);
  };

  const applySubscriptionKey = async (keyRaw: string): Promise<{ ok: boolean; message: string }> => {
    if (!user) return { ok: false, message: 'Сначала войдите в аккаунт' };
    const key = keyRaw.trim();
    if (!key) return { ok: false, message: 'Введите ключ' };

    try {
      const { ref, get, child, update } = await import('firebase/database');
      const { database } = await import('../utils/firebase');
      const dbRef = ref(database);
      const keySnapshot = await get(child(dbRef, `keys/${key}`));
      if (!keySnapshot.exists()) {
        return { ok: false, message: 'Неизвестный ключ' };
      }

      const keyData = keySnapshot.val();
      const activatedBy = keyData?.activatedBy || keyData?.usedBy || keyData?.owner;
      const alreadyUsed = Boolean(
        keyData?.isUsed ||
        keyData?.used ||
        keyData?.activated ||
        (activatedBy && activatedBy !== user.username)
      );
      if (alreadyUsed && activatedBy !== user.username) {
        return { ok: false, message: 'он был уже активированом' };
      }
      const { days, plan } = resolveKeyDaysAndPlan(keyData);
      if (plan === 'none' && days === null) {
        return { ok: false, message: 'Ключ найден, но у него нет срока подписки' };
      }

      let nextPlan = plan;
      let nextExpiresAt = user.subscription.expiresAt;
      if (plan === 'lifetime') {
        nextExpiresAt = '∞';
      } else {
        const extendDays = days || 0;
        const currentExpiry =
          user.subscription.expiresAt !== '-' && user.subscription.expiresAt !== '∞'
            ? new Date(user.subscription.expiresAt)
            : new Date();
        const baseDate = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
        baseDate.setDate(baseDate.getDate() + extendDays);
        nextExpiresAt = baseDate.toISOString();
        if (!nextPlan || nextPlan === 'none') {
          nextPlan = normalizePlanName(user.subscription.plan, extendDays) || 'month';
        }
      }

      const nextSubscription = {
        plan: nextPlan === 'none' ? user.subscription.plan : nextPlan,
        status: 'active',
        expiresAt: nextExpiresAt,
      };

      const saved = localStorage.getItem('rainclient_users');
      const users = saved ? JSON.parse(saved) : {};
      const updatedUser = {
        ...users[user.username],
        subscription: nextSubscription,
      };
      users[user.username] = updatedUser;
      localStorage.setItem('rainclient_users', JSON.stringify(users));
      setUser(updatedUser);

      await update(ref(database, `users/${user.username}`), {
        key,
        subscription: nextSubscription,
        activatedAt: new Date().toISOString(),
      });
      await update(ref(database, `keys/${key}`), {
        isUsed: true,
        used: true,
        activated: true,
        activatedBy: user.username,
        activatedAt: new Date().toISOString(),
      });

      const successMessage =
        plan === 'lifetime'
          ? 'Ключ имеется: активирована подписка lifetime'
          : `Ключ имеется: добавлено ${days} дн. к подписке`;
      return { ok: true, message: successMessage };
    } catch (error: any) {
      return { ok: false, message: error?.message || 'Ошибка при проверке ключа' };
    }
  };

  const downloadLoader = () => {
    const a = document.createElement('a');
    a.href = '/RainLoader.exe';
    a.download = 'RainLoader.exe';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const logout = () => {
    setUser(null);
    setPage('home');
  };

  const spinRoulette = (days: number) => {
    if (!user) return;
    const saved = localStorage.getItem('rainclient_users');
    const users = saved ? JSON.parse(saved) : {};

    let nextSubscription = { ...user.subscription };
    if (days > 0) {
      let expiresAt = user.subscription.expiresAt;
      if (expiresAt !== '∞') {
        const expDate = expiresAt !== '-' ? new Date(expiresAt) : new Date();
        if (expDate.getTime() > Date.now()) {
          expDate.setDate(expDate.getDate() + days);
        } else {
          expDate.setTime(Date.now() + days * 24 * 60 * 60 * 1000);
        }
        expiresAt = expDate.toISOString();
      }
      nextSubscription = {
        ...user.subscription,
        plan: user.subscription.plan === 'none' ? inferPlanFromDays(days) : user.subscription.plan,
        expiresAt,
        status: 'active',
      };
    }

    const updatedUser = {
      ...users[user.username],
      subscription: nextSubscription,
      lastRewardAt: new Date().toISOString()
    };
    
    users[user.username] = updatedUser;
    localStorage.setItem('rainclient_users', JSON.stringify(users));
    setUser(updatedUser);
  };

  return (
    <AppContext.Provider value={{
      lang, setLang, t, user, login, register, logout,
      page, setPage, showAuth, setShowAuth,
      showPurchase, setShowPurchase, purchaseSubscription, downloadLoader,
      applySubscriptionKey, spinRoulette
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
