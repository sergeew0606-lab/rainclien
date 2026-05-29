export type PurchasePlan = 'month' | 'year' | 'lifetime';

export interface PendingPayment {
  username: string;
  plan: PurchasePlan;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  createdAt: number;
  paidAt?: string;
  operationId?: string;
  fulfilled?: boolean;
}

export function generatePaymentId(): string {
  const chunk = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RC-PAY-${Date.now().toString(36).toUpperCase()}-${chunk()}`;
}

export function paymentLabel(paymentId: string): string {
  return `RainClient ${paymentId}`;
}

export async function createPendingPayment(
  username: string,
  plan: PurchasePlan,
  amount: number
): Promise<string> {
  const { ref, set } = await import('firebase/database');
  const { database } = await import('./firebase');
  const paymentId = generatePaymentId();
  const record: PendingPayment = {
    username,
    plan,
    amount,
    status: 'pending',
    createdAt: Date.now(),
  };
  await set(ref(database, `payments/${paymentId}`), record);
  return paymentId;
}

export async function getPendingPayment(
  paymentId: string
): Promise<PendingPayment | null> {
  const { ref, get, child } = await import('firebase/database');
  const { database } = await import('./firebase');
  const snap = await get(child(ref(database), `payments/${paymentId}`));
  if (!snap.exists()) return null;
  return snap.val() as PendingPayment;
}

export async function waitForPaymentVerified(
  paymentId: string,
  maxMs = 300000,
  intervalMs = 2000
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const payment = await getPendingPayment(paymentId);
    if (payment?.status === 'paid') return true;
    if (payment?.status === 'failed') return false;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

/** Подтянуть оплату по ID (если потеряли localStorage) */
export async function recoverPaymentById(
  paymentId: string
): Promise<PendingPayment | null> {
  const id = paymentId.trim().toUpperCase();
  if (!/^RC-PAY-[A-Z0-9-]+$/.test(id)) return null;
  return getPendingPayment(id);
}

export async function markPaymentFulfilled(paymentId: string): Promise<void> {
  try {
    const { ref, update } = await import('firebase/database');
    const { database } = await import('./firebase');
    await update(ref(database, `payments/${paymentId}`), {
      fulfilled: true,
      fulfilledAt: new Date().toISOString(),
    });
  } catch {
    // Rules may block client writes after create — subscription still granted
  }
}
