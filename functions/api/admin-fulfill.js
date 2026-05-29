/**
 * Ручная выдача подписки по ID платежа (если деньги пришли, а webhook не сработал).
 * POST JSON: { "paymentId": "RC-PAY-...", "secret": "ваш_секрет" }
 * Cloudflare secret: ADMIN_FULFILL_SECRET
 */

const LIFETIME_EXPIRES_AT = '2038-01-31T23:59:59.999Z';

function generatePurchaseKeyCode() {
  const chunk = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RC-${Date.now().toString(36).toUpperCase()}-${chunk()}${chunk()}`;
}

async function dbJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Firebase ${res.status}`);
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
  await fetch(`${dbUrl}/keys/${encodeURIComponent(key)}.json?${authQuery}`, {
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

  await fetch(userPath, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: {
        plan: plan === 'year' ? 'year' : 'month',
        status: 'active',
        expiresAt,
      },
      key,
      activatedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      lastPurchasePlan: plan,
      updatedAt: new Date().toISOString(),
    }),
  });
}

export async function onRequestPost(context) {
  const adminSecret = context.env.ADMIN_FULFILL_SECRET;
  const dbUrl = context.env.FIREBASE_DB_URL;
  const dbSecret = context.env.FIREBASE_DB_SECRET;

  if (!adminSecret || !dbUrl || !dbSecret) {
    return Response.json({ ok: false, error: 'Not configured' }, { status: 500 });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (body?.secret !== adminSecret) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const paymentId = String(body?.paymentId || '').toUpperCase();
  if (!/^RC-PAY-[A-Z0-9-]+$/.test(paymentId)) {
    return Response.json({ ok: false, error: 'Invalid paymentId' }, { status: 400 });
  }

  const authQuery = `auth=${encodeURIComponent(dbSecret)}`;
  const paymentPath = `${dbUrl}/payments/${paymentId}.json?${authQuery}`;

  const payment = await dbJson(paymentPath);
  if (!payment) {
    return Response.json({ ok: false, error: 'Payment not found' }, { status: 404 });
  }

  if (payment.fulfilled) {
    return Response.json({ ok: true, message: 'Already fulfilled', username: payment.username });
  }

  if (body?.markPaid && payment.status !== 'paid') {
    await fetch(paymentPath, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'paid',
        paidAt: new Date().toISOString(),
        manualFulfill: true,
      }),
    });
  } else if (payment.status !== 'paid') {
    return Response.json({
      ok: false,
      error: 'Payment not paid. Pass markPaid:true only if money is on wallet.',
    }, { status: 400 });
  }

  try {
    await grantSubscriptionOnServer(dbUrl, authQuery, payment.username, payment.plan);
    await fetch(paymentPath, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fulfilled: true,
        fulfilledAt: new Date().toISOString(),
        manualFulfill: true,
      }),
    });
    return Response.json({
      ok: true,
      message: 'Subscription granted',
      username: payment.username,
      plan: payment.plan,
    });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
