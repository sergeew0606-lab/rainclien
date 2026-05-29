/**
 * Cloudflare Pages Function — HTTP-уведомления ЮMoney.
 * URL: https://rainclien.pages.dev/api/yoomoney-webhook
 *
 * Secrets: YOOMONEY_NOTIFICATION_SECRET, FIREBASE_DB_URL, FIREBASE_DB_SECRET
 */

const LIFETIME_EXPIRES_AT = '2038-01-31T23:59:59.999Z';

async function sha1Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function extractPaymentId(...fields) {
  for (const raw of fields) {
    if (!raw) continue;
    const match = String(raw).match(/RC-PAY-[A-Z0-9-]+/i);
    if (match) return match[0].toUpperCase();
  }
  return null;
}

function parseAmount(value) {
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

function amountsMatch(expected, withdrawAmount, creditedAmount) {
  const candidates = [withdrawAmount, creditedAmount].filter((n) => Number.isFinite(n));
  return candidates.some((n) => n === expected);
}

function generatePurchaseKeyCode() {
  const chunk = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RC-${Date.now().toString(36).toUpperCase()}-${chunk()}${chunk()}`;
}

async function dbJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Firebase ${res.status}`);
  }
  const text = await res.text();
  if (!text || text === 'null') return null;
  return JSON.parse(text);
}

async function grantSubscriptionOnServer(dbUrl, authQuery, username, plan) {
  const userPath = `${dbUrl}/users/${encodeURIComponent(username)}.json?${authQuery}`;
  const user = (await dbJson(userPath)) || {};
  const current = user.subscription || { plan: 'none', status: 'none', expiresAt: '-' };

  if (plan === 'lifetime') {
    await fetch(userPath, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: { plan: 'lifetime', status: 'active', expiresAt: LIFETIME_EXPIRES_AT },
        paidAt: new Date().toISOString(),
        lastPurchasePlan: plan,
        updatedAt: new Date().toISOString(),
      }),
    });
    return;
  }

  const days = plan === 'month' ? 30 : 365;
  const key = generatePurchaseKeyCode();
  const keyPath = `${dbUrl}/keys/${encodeURIComponent(key)}.json?${authQuery}`;

  await fetch(keyPath, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      days,
      durationDays: days,
      plan,
      createdAt: new Date().toISOString(),
      createdFor: username,
      paymentType: 'purchase',
      isUsed: true,
      used: true,
      activated: true,
      activatedBy: username,
      activatedAt: new Date().toISOString(),
    }),
  });

  let expiresAt = current.expiresAt;
  if (expiresAt && expiresAt !== '-' && expiresAt !== '∞') {
    const currentExpiry = new Date(expiresAt);
    const baseDate = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    expiresAt = baseDate.toISOString();
  } else {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + days);
    expiresAt = baseDate.toISOString();
  }

  const nextPlan = plan === 'year' ? 'year' : 'month';
  await fetch(userPath, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: { plan: nextPlan, status: 'active', expiresAt },
      key,
      activatedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      lastPurchasePlan: plan,
      updatedAt: new Date().toISOString(),
    }),
  });
}

async function fulfillPaymentOnServer(dbUrl, authQuery, paymentId, payment) {
  if (!payment || payment.fulfilled) return;

  const username = payment.username;
  const plan = payment.plan;
  if (!username || !plan) return;

  await grantSubscriptionOnServer(dbUrl, authQuery, username, plan);

  const paymentPath = `${dbUrl}/payments/${paymentId}.json?${authQuery}`;
  await fetch(paymentPath, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fulfilled: true,
      fulfilledAt: new Date().toISOString(),
    }),
  });
}

export async function onRequestPost(context) {
  const secret = context.env.YOOMONEY_NOTIFICATION_SECRET;
  const dbUrl = context.env.FIREBASE_DB_URL;
  const dbSecret = context.env.FIREBASE_DB_SECRET;

  if (!secret || !dbUrl || !dbSecret) {
    return new Response('Webhook not configured', { status: 500 });
  }

  let params;
  const contentType = context.request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await context.request.json();
    params = new URLSearchParams(Object.entries(json).map(([k, v]) => [k, String(v)]));
  } else {
    const body = await context.request.text();
    params = new URLSearchParams(body);
  }

  const notificationType = params.get('notification_type') || '';
  const operationId = params.get('operation_id') || '';
  const amount = params.get('amount') || '';
  const withdrawAmount = params.get('withdraw_amount') || '';
  const currency = params.get('currency') || '';
  const datetime = params.get('datetime') || '';
  const sender = params.get('sender') || '';
  const codepro = params.get('codepro') || 'false';
  const label = params.get('label') || '';
  const comment = params.get('comment') || '';
  const sha1Hash = (params.get('sha1_hash') || '').toLowerCase();

  const checkString = [
    notificationType,
    operationId,
    amount,
    currency,
    datetime,
    sender,
    codepro,
    secret,
    label,
  ].join('&');

  const expectedHash = await sha1Hex(checkString);
  if (sha1Hash !== expectedHash) {
    return new Response('Invalid signature', { status: 403 });
  }

  const paymentId = extractPaymentId(label, comment);
  if (!paymentId) {
    return new Response('OK', { status: 200 });
  }

  const authQuery = `auth=${encodeURIComponent(dbSecret)}`;
  const paymentPath = `${dbUrl}/payments/${paymentId}.json?${authQuery}`;

  let payment;
  try {
    payment = await dbJson(paymentPath);
  } catch {
    return new Response('Payment lookup failed', { status: 500 });
  }

  if (!payment) {
    return new Response('OK', { status: 200 });
  }

  if (payment.status === 'paid') {
    try {
      await fulfillPaymentOnServer(dbUrl, authQuery, paymentId, payment);
    } catch {
      return new Response('Fulfill failed', { status: 500 });
    }
    return new Response('OK', { status: 200 });
  }

  const paidWithdraw = parseAmount(withdrawAmount);
  const paidCredited = parseAmount(amount);
  const expectedAmount = parseAmount(payment.amount);

  if (!amountsMatch(expectedAmount, paidWithdraw, paidCredited)) {
    await fetch(paymentPath, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'failed',
        failReason: 'amount_mismatch',
        paidWithdraw,
        paidCredited,
        expectedAmount,
      }),
    });
    return new Response('Amount mismatch', { status: 400 });
  }

  await fetch(paymentPath, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'paid',
      paidAt: new Date().toISOString(),
      operationId,
      notificationType,
      paidWithdraw,
      paidCredited,
    }),
  });

  try {
    const updated = { ...payment, status: 'paid' };
    await fulfillPaymentOnServer(dbUrl, authQuery, paymentId, updated);
  } catch {
    return new Response('Fulfill failed', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}
