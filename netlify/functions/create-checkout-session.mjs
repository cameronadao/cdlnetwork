import {
  getDeliveryAssets, getProductAssets, getProducts, getSiteUrl, getStripeProducts,
  jsonResponse, requiredEnvironment, stripeRequest
} from './_shared/commerce.mjs';

export default async function createCheckoutSession(request) {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  const missing = requiredEnvironment();
  if (missing.length) return jsonResponse({ error: 'Direct checkout is not configured yet.' }, 503);

  try {
    const body = await request.json();
    const productId = typeof body.productId === 'string' ? body.productId : '';
    const locale = body.locale === 'fr' ? 'fr' : 'en';
    const [products, assets, stripeProducts] = await Promise.all([getProducts(), getDeliveryAssets(), getStripeProducts()]);
    const product = products.find((item) => item?.id === productId && item.status === 'published');
    if (!product) return jsonResponse({ error: 'This product is not available.' }, 404);
    if (product.checkoutProvider !== 'stripe') return jsonResponse({ error: 'Direct checkout is not enabled for this product.' }, 409);
    if (!getProductAssets(product.id, assets).length) return jsonResponse({ error: 'Secure product delivery is not configured.' }, 503);
    const stripeProduct = stripeProducts?.[product.id];
    if (!stripeProduct?.priceId || !/^price_[A-Za-z0-9]+$/.test(stripeProduct.priceId) || !stripeProduct.taxCode || stripeProduct.taxBehavior !== 'inclusive') {
      return jsonResponse({ error: 'Managed Payments price, tax category, or TTC configuration is incomplete.' }, 503);
    }

    const amount = Number(product.price);
    const currency = String(product.currency || '').toLowerCase();
    if (!Number.isFinite(amount) || amount <= 0 || !/^[a-z]{3}$/.test(currency)) {
      return jsonResponse({ error: 'This product cannot be checked out online.' }, 400);
    }

    const price = await stripeRequest(`prices/${encodeURIComponent(stripeProduct.priceId)}?expand[]=product`);
    const stripeCatalogProduct = typeof price.product === 'object' ? price.product : null;
    if (!price.active || !stripeCatalogProduct?.active || Number(price.unit_amount) !== Math.round(amount * 100) || String(price.currency).toLowerCase() !== currency || stripeCatalogProduct.tax_code !== stripeProduct.taxCode || price.tax_behavior !== 'inclusive') {
      return jsonResponse({ error: 'The Stripe price, tax category, or TTC setting does not match the published product.' }, 409);
    }

    const siteUrl = getSiteUrl();
    const form = new URLSearchParams({
      mode: 'payment',
      success_url: `${siteUrl}/order-confirmation.html?session_id={CHECKOUT_SESSION_ID}&lang=${locale}`,
      cancel_url: `${siteUrl}/product.html?id=${encodeURIComponent(product.id)}`,
      'line_items[0][quantity]': '1',
      'line_items[0][price]': stripeProduct.priceId,
      'managed_payments[enabled]': 'true',
      'metadata[product_id]': product.id,
      'metadata[locale]': locale,
      locale
    });

    const session = await stripeRequest('checkout/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form
    });
    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error('Checkout session creation failed:', error);
    return jsonResponse({ error: 'We could not start checkout. Please try again shortly.' }, 500);
  }
}

export const config = { path: '/api/checkout', method: 'POST' };
