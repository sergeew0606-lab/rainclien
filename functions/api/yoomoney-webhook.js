/**
 * Cloudflare Pages Function — HTTP-уведомления ЮMoney.
 *
 * В кошельке ЮMoney: Настройки → HTTP-уведомления
 * URL: https://ВАШ-ДОМЕН/api/yoomoney-webhook
 *
 * Переменные в Cloudflare (Settings → Environment variables):
 * - YOOMONEY_NOTIFICATION_SECRET — секрет из настроек уведомлений
 * - FIREBASE_DB_URL — https://rainclient-default-rtdb.firebaseio.com
 * - FIREBASE_DB_SECRET — legacy secret Database (Rules → Secret)
 */

async function sha1Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, 'hex'))
    .join('');
}

function extractPaymentId(label) {
  if (!label) return null;
  const match = String(label).match(/RC-PAY-[A-Z0-9-]+/i);
  return match ? match[0].toUpperCase() : null;
}

function parseAmount(value) {
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : NaN;
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
  const currency = params.get('currency') || '';
  const datetime = params.get('datetime') || '';
  const sender = params.get('sender') || '';
  const codepro = params.get('codepro') || 'false';
  const label = params.get('label') || '';
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

  const paymentId = extractPaymentId(label);
  if (!paymentId) {
    return new Response('OK', { status: 200 });
  }

  const authQuery = `auth=${encodeURIComponent(dbSecret)}`;
  const paymentRes = await fetch(`${dbUrl}/payments/${paymentId}.json?${authQuery}`);
  if (!paymentRes.ok) {
    return new Response('Payment lookup failed', { status: 500 });
  }

  const payment = await paymentRes.json();
  if (!payment || payment.status === 'paid') {
    return new Response('OK', { status: 200 });
  }

  const paidAmount = parseAmount(amount);
  const expectedAmount = parseAmount(payment.amount);
  if (!Number.isFinite(paidAmount) || paidAmount !== expectedAmount) {
    await fetch(`${dbUrl}/payments/${paymentId}.json?${authQuery}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'failed',
        failReason: 'amount_mismatch',
        paidAmount,
        expectedAmount,
      }),
    });
    return new Response('Amount mismatch', { status: 400 });
  }

  await fetch(`${dbUrl}/payments/${paymentId}.json?${authQuery}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'paid',
      paidAt: new Date().toISOString(),
      operationId,
      notificationType,
    }),
  });

  return new Response('OK', { status: 200 });
}
