import { createHmac, timingSafeEqual } from 'node:crypto';
import { createSignedDownloads, escapeHtml, getProducts, jsonResponse, readJsonResponse, supabaseAuthHeaders } from './_shared/commerce.mjs';

function isValidSignature(rawBody, header, secret) {
  const parts = header.split(',').map((part) => part.trim().split('='));
  const timestamp = Number(parts.find(([key]) => key === 't')?.[1]);
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300 || !signatures.length) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest();
  return signatures.some((signature) => {
    const supplied = Buffer.from(signature, 'hex');
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  });
}

async function supabaseRequest(path, options = {}) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: supabaseAuthHeaders({ 'content-type': 'application/json', ...(options.headers || {}) })
  });
  if (!response.ok) throw new Error(`Order database request failed (${response.status}).`);
  const method = (options.method || 'GET').toUpperCase();
  const allowEmpty = response.status === 204 || ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
  return readJsonResponse(response, 'Supabase order database', { allowEmpty });
}

function emailMarkup(product, links, locale) {
  const title = escapeHtml(product.translations?.[locale]?.title || product.title);
  const downloads = links.map((link) => `<li><a href="${escapeHtml(link.url)}">${escapeHtml(link.name)}</a></li>`).join('');
  if (locale === 'fr') {
    return { subject: `Votre téléchargement : ${title}`, html: `<p>Merci pour votre achat !</p><h1>${title}</h1><p>Vos liens de téléchargement privés expirent dans 24 heures. Vous pouvez revenir à la page de confirmation pour en générer de nouveaux si nécessaire.</p><ul>${downloads}</ul><p>CDL Network</p>` };
  }
  return { subject: `Your download: ${title}`, html: `<p>Thank you for your purchase!</p><h1>${title}</h1><p>Your private download links expire in 24 hours. You can return to the confirmation page to generate new links if needed.</p><ul>${downloads}</ul><p>CDL Network</p>` };
}

export default async function stripeWebhook(request) {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  const hostname = new URL(request.url).hostname;
  const isNetlifyPreview = /^[a-z0-9-]+--cdlnetwork\.netlify\.app$/i.test(hostname);
  const secret = isNetlifyPreview
    ? process.env.STRIPE_WEBHOOK_SECRET_PREVIEW
    : process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return jsonResponse({ error: 'Webhook is not configured.' }, 503);
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature') || '';
  if (!isValidSignature(rawBody, signature, secret)) return jsonResponse({ error: 'Invalid Stripe signature.' }, 400);

  try {
    const event = JSON.parse(rawBody);
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      return jsonResponse({ received: true });
    }
    const session = event.data?.object;
    if (!session || session.payment_status !== 'paid' || session.mode !== 'payment') return jsonResponse({ received: true });
    const productId = session.metadata?.product_id;
    const email = session.customer_details?.email;
    if (!productId || !email) throw new Error('Paid session is missing product or customer email.');

    const orders = await supabaseRequest(`orders?stripe_session_id=eq.${encodeURIComponent(session.id)}&select=stripe_session_id,delivered_at`);
    if (orders?.[0]?.delivered_at) return jsonResponse({ received: true, delivered: true });
    await supabaseRequest('orders?on_conflict=stripe_session_id', {
      method: 'POST',
      headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        stripe_session_id: session.id, product_id: productId, customer_email: email,
        payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        amount_total: session.amount_total, currency: session.currency, payment_status: 'paid'
      })
    });

    const [links, products] = await Promise.all([createSignedDownloads(productId), getProducts()]);
    const product = products.find((item) => item.id === productId);
    if (!product) throw new Error(`Product ${productId} was not found.`);
    const message = emailMarkup(product, links, session.metadata?.locale === 'fr' ? 'fr' : 'en');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'content-type': 'application/json',
        'idempotency-key': `cdl-order-${session.id}`
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [email], subject: message.subject, html: message.html
      })
    });
    if (!response.ok) throw new Error(`Delivery email could not be sent (${response.status}).`);
    await supabaseRequest(`orders?stripe_session_id=eq.${encodeURIComponent(session.id)}`, {
      method: 'PATCH', headers: { prefer: 'return=minimal' },
      body: JSON.stringify({ delivered_at: new Date().toISOString() })
    });
    return jsonResponse({ received: true, delivered: true });
  } catch (error) {
    console.error('Stripe webhook fulfillment failed:', error);
    return jsonResponse({ error: 'Order fulfillment will be retried.' }, 500);
  }
}

export const config = { path: '/api/stripe-webhook', method: 'POST' };
