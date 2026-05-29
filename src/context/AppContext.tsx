import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lang, translations, Translations } from '../i18n';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import {
  type PurchasePlan,
  getPendingPayment,
  markPaymentFulfilled,
  waitForPaymentVerified,
} from '../utils/payments';

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
  twoFactorSecret?: string;
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
  updateEmail: (email: string) => Promise<{ ok: boolean; message: string }>;
  page: 'home' | 'profile';
  setPage: (p: 'home' | 'profile') => void;
  showAuth: 'login' | 'register' | null;
  setShowAuth: (v: 'login' | 'register' | null) => void;
  showPurchase: boolean;
  setShowPurchase: (v: boolean) => void;
  purchaseSubscription: (plan: PurchasePlan) => Promise<void>;
  fulfillPaymentAfterSuccess: (
    paymentId: string,
    options?: { waitForVerificationMs?: number }
  ) => Promise<{ ok: boolean; message: string }>;
  applySubscriptionKey: (key: string) => Promise<{ ok: boolean; message: string }>;
  createTwoFactorSetup: () => Promise<{ ok: boolean; message: string; secret?: string; qrCodeUrl?: string }>;
  enableTwoFactor: (secret: string, code: string) => Promise<{ ok: boolean; message: string }>;
  disableTwoFactor: () => Promise<{ ok: boolean; message: string }>;
  downloadLoader: () => void;
  spinRoulette: (days: number) => void;
  syncSessionFromStorage: () => void;
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

/** Навсегда = до 31.01.2038 */
export const LIFETIME_EXPIRES_AT = '2038-01-31T23:59:59.999Z';

export type { PurchasePlan };

function generatePurchaseKeyCode(): string {
  const chunk = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RC-${Date.now().toString(36).toUpperCase()}-${chunk()}${chunk()}`;
}

async function createPurchaseKeyInFirebase(
  plan: 'month' | 'year',
  username: string
): Promise<string> {
  const { ref, set } = await import('firebase/database');
  const { database } = await import('../utils/firebase');
  const days = plan === 'month' ? 30 : 365;
  const key = generatePurchaseKeyCode();
  await set(ref(database, `keys/${key}`), {
    days,
    durationDays: days,
    plan,
    createdAt: new Date().toISOString(),
    createdFor: username,
    paymentType: 'purchase',
    isUsed: false,
    used: false,
    activated: false,
  });
  return key;
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

  const syncSessionFromStorage = () => {
    const saved = localStorage.getItem('rainclient_user');
    if (!saved) return;
    const parsed = JSON.parse(saved);
    setUser({
      ...parsed,
      subscription: normalizeSubscription(parsed.subscription),
    });
  };

  const persistUserSubscription = async (
    username: string,
    subscription: User['subscription'],
    extraFirebase?: Record<string, unknown>
  ) => {
    const saved = localStorage.getItem('rainclient_users');
    const users = saved ? JSON.parse(saved) : {};
    const account = users[username];
    if (!account) return;

    const updatedUser = { ...account, subscription };
    users[username] = updatedUser;
    localStorage.setItem('rainclient_users', JSON.stringify(users));

    const sessionRaw = localStorage.getItem('rainclient_user');
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      if (session.username === username) {
        localStorage.setItem('rainclient_user', JSON.stringify(updatedUser));
        setUser({ ...updatedUser, subscription });
      }
    }

    try {
      const { ref, update } = await import('firebase/database');
      const { database } = await import('../utils/firebase');
      await update(ref(database, `users/${username}`), {
        subscription,
        updatedAt: new Date().toISOString(),
        ...extraFirebase,
      });
    } catch (err) {
      console.error('Failed to sync user to Firebase:', err);
    }
  };

  const activateSubscriptionKeyForUser = async (
    username: string,
    key: string
  ): Promise<{ ok: boolean; message: string }> => {
    const saved = localStorage.getItem('rainclient_users');
    const users = saved ? JSON.parse(saved) : {};
    if (!users[username]) return { ok: false, message: 'Пользователь не найден' };

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
        (activatedBy && activatedBy !== username)
      );
      if (alreadyUsed && activatedBy !== username) {
        return { ok: false, message: 'Ключ уже активирован другим пользователем' };
      }

      const currentSub: User['subscription'] =
        users[username].subscription || { plan: 'none', status: 'none', expiresAt: '-' };
      const { days, plan: keyPlan } = resolveKeyDaysAndPlan(keyData);
      if (keyPlan === 'none' && days === null) {
        return { ok: false, message: 'У ключа нет срока подписки' };
      }

      let nextPlan = keyPlan;
      let nextExpiresAt = currentSub.expiresAt;
      if (keyPlan === 'lifetime') {
        nextExpiresAt = LIFETIME_EXPIRES_AT;
      } else {
        const extendDays = days || 0;
        const currentExpiry =
          currentSub.expiresAt !== '-' && currentSub.expiresAt !== '∞'
            ? new Date(currentSub.expiresAt)
            : new Date();
        const baseDate = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
        baseDate.setDate(baseDate.getDate() + extendDays);
        nextExpiresAt = baseDate.toISOString();
        if (!nextPlan || nextPlan === 'none') {
          nextPlan = normalizePlanName(currentSub.plan, extendDays) || 'month';
        }
      }

      const nextSubscription: User['subscription'] = {
        plan: nextPlan === 'none' ? currentSub.plan : nextPlan,
        status: 'active',
        expiresAt: nextExpiresAt,
      };

      await persistUserSubscription(username, nextSubscription, {
        key,
        activatedAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
      });

      await update(ref(database, `keys/${key}`), {
        isUsed: true,
        used: true,
        activated: true,
        activatedBy: username,
        activatedAt: new Date().toISOString(),
      });

      const successMessage =
        keyPlan === 'lifetime'
          ? `Ключ ${key}: подписка до 31.01.2038`
          : `Ключ ${key}: +${days} дн., активирован`;
      return { ok: true, message: successMessage };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка активации ключа';
      return { ok: false, message };
    }
  };

  const ensureLocalUserAccount = async (username: string): Promise<boolean> => {
    const saved = localStorage.getItem('rainclient_users');
    const users = saved ? JSON.parse(saved) : {};
    if (users[username]) return true;

    try {
      const { ref, get, child } = await import('firebase/database');
      const { database } = await import('../utils/firebase');
      const snap = await get(child(ref(database), `users/${username}`));
      if (!snap.exists()) return false;

      const firebaseData = snap.val();
      const subscription = normalizeSubscription(firebaseData);
      const now = new Date();
      users[username] = {
        username,
        email: firebaseData?.email || '',
        hwid: firebaseData?.hwid || generateHWID(),
        uid: firebaseData?.uid ?? getNextUID(),
        regDate: firebaseData?.regDate || now.toISOString().split('T')[0],
        subscription,
        stats: firebaseData?.stats || {
          sessions: 0,
          hoursPlayed: 0,
          configsSaved: 0,
          serversPlayed: 0,
          lastSession: '-',
        },
        twoFactor: Boolean(firebaseData?.twoFactor),
        twoFactorSecret: firebaseData?.twoFactorSecret || '',
        configs: firebaseData?.configs || [],
        activity: firebaseData?.activity || Array.from({ length: 7 }, () => 0),
        rewardCount: firebaseData?.rewardCount ?? 0,
        lastRewardAt: firebaseData?.lastRewardAt ?? '',
      };
      localStorage.setItem('rainclient_users', JSON.stringify(users));
      return true;
    } catch {
      return false;
    }
  };

  const grantSubscriptionToUser = async (
    username: string,
    plan: PurchasePlan
  ): Promise<{ ok: boolean; message: string }> => {
    const hasAccount = await ensureLocalUserAccount(username);
    if (!hasAccount) {
      return { ok: false, message: 'Пользователь не найден. Войдите под тем же логином, что при покупке.' };
    }

    const saved = localStorage.getItem('rainclient_users');
    const users = saved ? JSON.parse(saved) : {};
    if (!users[username]) {
      return { ok: false, message: 'Пользователь не найден' };
    }

    try {
      if (plan === 'lifetime') {
        const subscription: User['subscription'] = {
          plan: 'lifetime',
          status: 'active',
          expiresAt: LIFETIME_EXPIRES_AT,
        };
        await persistUserSubscription(username, subscription, {
          paidAt: new Date().toISOString(),
          lastPurchasePlan: plan,
        });
        return { ok: true, message: 'Подписка «Навсегда» до 31.01.2038' };
      }

      const key = await createPurchaseKeyInFirebase(plan, username);
      return activateSubscriptionKeyForUser(username, key);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка выдачи подписки';
      return { ok: false, message };
    }
  };

  /** Выдача подписки только после подтверждения ЮMoney (webhook → status paid в Firebase) */
  const fulfillPaymentAfterSuccess = async (
    paymentId: string,
    options?: { waitForVerificationMs?: number }
  ): Promise<{ ok: boolean; message: string }> => {
    let payment = await getPendingPayment(paymentId);
    if (payment?.fulfilled) {
      return { ok: true, message: 'Подписка уже активирована' };
    }

    if (payment?.status === 'failed') {
      return {
        ok: false,
        message: 'Платёж не принят: неверная сумма или отмена. Проверьте сумму и комментарий к переводу.',
      };
    }

    if (payment?.status !== 'paid') {
      const waitMs = options?.waitForVerificationMs ?? 0;
      if (waitMs > 0) {
        const verified = await waitForPaymentVerified(paymentId, waitMs);
        if (!verified) {
          return {
            ok: false,
            message:
              'ЮMoney ещё не подтвердил оплату. Подождите 1–2 минуты и нажмите «Я оплатил» снова. В комментарии к платежу должен быть номер заказа (RC-PAY-…).',
          };
        }
        payment = await getPendingPayment(paymentId);
      } else {
        return {
          ok: false,
          message: 'Оплата ещё не подтверждена. Дождитесь зачисления на кошелёк или нажмите «Я оплатил».',
        };
      }
    }

    const plan = (payment?.plan ||
      localStorage.getItem('pending_purchase_plan')) as PurchasePlan | null;
    const username =
      payment?.username ||
      localStorage.getItem('pending_purchase_user') ||
      user?.username;

    if (!plan || !username) {
      return { ok: false, message: 'Не найдены данные покупки. Войдите и попробуйте снова.' };
    }

    if (user?.username && username !== user.username) {
      return {
        ok: false,
        message: `Этот платёж привязан к логину «${username}». Войдите под ним.`,
      };
    }

    const result = await grantSubscriptionToUser(username, plan);
    if (result.ok) {
      await markPaymentFulfilled(paymentId);
      syncSessionFromStorage();
    }
    return result;
  };

  // Оплачено на сервере, но вкладку закрыли — подтянуть подписку при входе
  useEffect(() => {
    if (!user) return;

    void (async () => {
      const paymentId = localStorage.getItem('pending_payment_id');
      if (!paymentId) return;

      const payment = await getPendingPayment(paymentId);
      if (payment?.status === 'paid' && !payment?.fulfilled) {
        await fulfillPaymentAfterSuccess(paymentId);
        return;
      }
      if (payment?.fulfilled) {
        localStorage.removeItem('pending_payment_id');
        localStorage.removeItem('pending_purchase_plan');
        localStorage.removeItem('pending_purchase_user');
        syncSessionFromStorage();
      }
    })();

    void (async () => {
      try {
        const { ref, get, child } = await import('firebase/database');
        const { database } = await import('../utils/firebase');
        const snap = await get(child(ref(database), `users/${user.username}`));
        if (!snap.exists()) return;

        const fbSub = normalizeSubscription(snap.val());
        const localSub = user.subscription;
        if (
          fbSub.status === 'active' &&
          (localSub.status !== 'active' ||
            (fbSub.expiresAt !== localSub.expiresAt && fbSub.expiresAt !== '-'))
        ) {
          await persistUserSubscription(user.username, fbSub);
        }
      } catch {
        // ignore sync errors
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run when user session loads
  }, [user?.username]);

  // Вкладка оплаты: ?payment=success → сразу выдача подписки
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    if (!paymentStatus) return;

    const finishPaymentUi = (completed: boolean) => {
      window.history.replaceState({}, document.title, window.location.pathname);
      if (completed) {
        localStorage.setItem('pending_purchase_status', 'completed');
        setPage('profile');
      } else {
        localStorage.removeItem('pending_purchase_status');
      }
      setShowPurchase(true);
    };

    if (paymentStatus === 'fail') {
      localStorage.removeItem('pending_payment_id');
      localStorage.removeItem('pending_purchase_plan');
      localStorage.removeItem('pending_purchase_user');
      finishPaymentUi(false);
      return;
    }

    if (paymentStatus !== 'success') return;

    const paymentId =
      urlParams.get('pid') || localStorage.getItem('pending_payment_id');
    if (!paymentId) {
      finishPaymentUi(false);
      return;
    }

    void (async () => {
      setShowPurchase(true);
      const result = await fulfillPaymentAfterSuccess(paymentId, {
        waitForVerificationMs: 180000,
      });
      localStorage.removeItem('pending_payment_id');
      localStorage.removeItem('pending_purchase_plan');
      localStorage.removeItem('pending_purchase_user');
      finishPaymentUi(result.ok);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when returning from payment URL
  }, []);

  // Main tab: subscription activated in the payment tab
  useEffect(() => {
    const onCompleted = () => {
      if (localStorage.getItem('pending_purchase_status') !== 'completed') return;
      syncSessionFromStorage();
      setPage('profile');
      setShowPurchase(true);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'pending_purchase_status' && e.newValue === 'completed') onCompleted();
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = (username: string, _password: string, firebaseData?: any): boolean => {
    const saved = localStorage.getItem('rainclient_users');
    const users = saved ? JSON.parse(saved) : {};

    const subscription = normalizeSubscription(firebaseData);

    const hwid = firebaseData?.hwid || (users[username]?.hwid) || generateHWID();
    const email = firebaseData?.email || (users[username]?.email) || '';
    const rewardCount = firebaseData?.rewardCount ?? users[username]?.rewardCount ?? 0;
    const lastRewardAt = firebaseData?.lastRewardAt ?? users[username]?.lastRewardAt ?? '';
    const twoFactor = Boolean(firebaseData?.twoFactor ?? users[username]?.twoFactor ?? false);
    const twoFactorSecret = firebaseData?.twoFactorSecret ?? users[username]?.twoFactorSecret ?? '';

    if (users[username]) {
      users[username].hwid = hwid;
      users[username].email = email;
      users[username].subscription = subscription;
      users[username].rewardCount = rewardCount;
      users[username].lastRewardAt = lastRewardAt;
      users[username].twoFactor = twoFactor;
      users[username].twoFactorSecret = twoFactorSecret;
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
      twoFactor,
      configs: [],
      activity: Array.from({ length: 7 }, () => 0),
      rewardCount: 0,
      lastRewardAt: '',
      twoFactorSecret,
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
      lastRewardAt: '',
      twoFactorSecret: '',
    };
    users[username] = newUser;
    localStorage.setItem('rainclient_users', JSON.stringify(users));
    setUser(newUser);
    return true;
  };

  const purchaseSubscription = async (plan: PurchasePlan) => {
    if (!user) return;
    await grantSubscriptionToUser(user.username, plan);
  };

  const applySubscriptionKey = async (keyRaw: string): Promise<{ ok: boolean; message: string }> => {
    if (!user) return { ok: false, message: 'Сначала войдите в аккаунт' };
    const key = keyRaw.trim();
    if (!key) return { ok: false, message: 'Введите ключ' };
    return activateSubscriptionKeyForUser(user.username, key);
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

  const updateEmail = async (emailRaw: string): Promise<{ ok: boolean; message: string }> => {
    if (!user) return { ok: false, message: 'Сначала войдите в аккаунт' };
    const email = emailRaw.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return { ok: false, message: 'Введите корректную почту' };

    try {
      const saved = localStorage.getItem('rainclient_users');
      const users = saved ? JSON.parse(saved) : {};
      const updatedUser = { ...users[user.username], email };
      users[user.username] = updatedUser;
      localStorage.setItem('rainclient_users', JSON.stringify(users));
      setUser(updatedUser);

      const { ref, update } = await import('firebase/database');
      const { database } = await import('../utils/firebase');
      await update(ref(database, `users/${user.username}`), { email });

      return { ok: true, message: 'Почта сохранена' };
    } catch (error: any) {
      return { ok: false, message: error?.message || 'Ошибка сохранения почты' };
    }
  };

  const createTwoFactorSetup = async (): Promise<{ ok: boolean; message: string; secret?: string; qrCodeUrl?: string }> => {
    if (!user) return { ok: false, message: 'Сначала войдите в аккаунт' };
    try {
      const secret = generateSecret();
      const service = 'RainClient';
      const otpauth = generateURI({ issuer: service, label: user.username, secret });
      const qrCodeUrl = await QRCode.toDataURL(otpauth);
      return { ok: true, message: 'Сканируйте QR и введите код', secret, qrCodeUrl };
    } catch (error: any) {
      return { ok: false, message: error?.message || 'Не удалось создать 2FA' };
    }
  };

  const enableTwoFactor = async (secretRaw: string, codeRaw: string): Promise<{ ok: boolean; message: string }> => {
    if (!user) return { ok: false, message: 'Сначала войдите в аккаунт' };
    const secret = secretRaw.trim();
    const code = codeRaw.trim();
    if (!secret || !code) return { ok: false, message: 'Введите код подтверждения' };
    const verifyResult = verifySync({ token: code, secret }) as { valid?: boolean };
    if (!verifyResult?.valid) return { ok: false, message: 'Неверный код 2FA' };

    try {
      const saved = localStorage.getItem('rainclient_users');
      const users = saved ? JSON.parse(saved) : {};
      const updatedUser = { ...users[user.username], twoFactor: true, twoFactorSecret: secret };
      users[user.username] = updatedUser;
      localStorage.setItem('rainclient_users', JSON.stringify(users));
      setUser(updatedUser);

      const { ref, update } = await import('firebase/database');
      const { database } = await import('../utils/firebase');
      await update(ref(database, `users/${user.username}`), {
        twoFactor: true,
        twoFactorSecret: secret,
      });

      return { ok: true, message: 'Двухфакторная аутентификация включена' };
    } catch (error: any) {
      return { ok: false, message: error?.message || 'Ошибка включения 2FA' };
    }
  };

  const disableTwoFactor = async (): Promise<{ ok: boolean; message: string }> => {
    if (!user) return { ok: false, message: 'Сначала войдите в аккаунт' };
    try {
      const saved = localStorage.getItem('rainclient_users');
      const users = saved ? JSON.parse(saved) : {};
      const updatedUser = { ...users[user.username], twoFactor: false, twoFactorSecret: '' };
      users[user.username] = updatedUser;
      localStorage.setItem('rainclient_users', JSON.stringify(users));
      setUser(updatedUser);

      const { ref, update } = await import('firebase/database');
      const { database } = await import('../utils/firebase');
      await update(ref(database, `users/${user.username}`), {
        twoFactor: false,
        twoFactorSecret: '',
      });

      return { ok: true, message: 'Двухфакторная аутентификация отключена' };
    } catch (error: any) {
      return { ok: false, message: error?.message || 'Ошибка отключения 2FA' };
    }
  };

  const spinRoulette = (days: number) => {
    if (!user) return;

    let nextSubscription = { ...user.subscription };
    if (days > 0) {
      let expiresAt = user.subscription.expiresAt;
      if (expiresAt !== '∞' && expiresAt !== LIFETIME_EXPIRES_AT) {
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

    const lastRewardAt = new Date().toISOString();
    const rewardCount = (user.rewardCount || 0) + 1;
    void persistUserSubscription(user.username, nextSubscription, {
      lastRewardAt,
      rewardCount,
    });
    setUser({
      ...user,
      subscription: nextSubscription,
      lastRewardAt,
      rewardCount,
    });
  };

  return (
    <AppContext.Provider value={{
      lang, setLang, t, user, login, register, logout, updateEmail,
      page, setPage, showAuth, setShowAuth,
      showPurchase, setShowPurchase, purchaseSubscription, fulfillPaymentAfterSuccess, downloadLoader,
      applySubscriptionKey, createTwoFactorSetup, enableTwoFactor, disableTwoFactor, spinRoulette,
      syncSessionFromStorage
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
