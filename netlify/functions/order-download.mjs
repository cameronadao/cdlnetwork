import {
  createSignedDownloads, jsonResponse, requiredEnvironment, stripeRequest
} from './_shared/commerce.mjs';

export default async function orderDownload(request) {
  if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed.' }, 405);
  const missing = requiredEnvironment();
  if (missing.length) return jsonResponse({ error: 'Secure delivery is not configured yet.' }, 503);
  const sessionId = new URL(request.url).searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return jsonResponse({ error: 'Invalid order reference.' }, 400);

  try {
    const session = await stripeRequest(`checkout/sessions/${encodeURIComponent(sessionId)}`);
    if (session.payment_status !== 'paid' || session.mode !== 'payment') {
      return jsonResponse({ error: 'Payment has not been confirmed.' }, 403);
    }
    const productId = session.metadata?.product_id;
    if (!productId) return jsonResponse({ error: 'No product is attached to this order.' }, 404);
    const links = await createSignedDownloads(productId);
    return jsonResponse({ email: session.customer_details?.email || '', links });
  } catch (error) {
    console.error('Order download could not be created:', error);
    return jsonResponse({ error: 'Your download is not available yet. Please contact support.' }, 500);
  }
}

export const config = { path: '/api/order-download', method: 'GET' };
