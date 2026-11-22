import { timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'payhip-products';

function json(body, status = 200, cache = false) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cache ? 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600' : 'no-store',
      ...(cache ? { 'netlify-cdn-cache-control': 'public, s-maxage=300, stale-while-revalidate=3600' } : {})
    }
  });
}

function readSecret() {
  try {
    return Netlify.env.get('PAYHIP_WEBHOOK_SECRET') || process.env.PAYHIP_WEBHOOK_SECRET || '';
  } catch {
    return process.env.PAYHIP_WEBHOOK_SECRET || '';
  }
}

function isAuthorized(request, secret) {
  const provided = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!secret || !provided) return false;
  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

function extractProductKey(source) {
  const direct = String(source.product_key || source.product_link || source.link || source.key || '').trim();
  if (/^[a-z0-9]{4,32}$/i.test(direct)) return direct;
  const url = String(source.product_url || source.product_permalink || source.url || '').trim();
  return url.match(/\/b\/([a-z0-9]{4,32})(?:[/?#]|$)/i)?.[1] || '';
}

function isZapierPlaceholder(source) {
  if (source?._zap_data_was_skipped === true || source?._zap_data_was_skipped === 'true') return true;
  const key = extractProductKey(source);
  const title = String(source?.product_name || source?.name || source?.title || '').trim().toLowerCase();
  const rawPrice = String(source?.price ?? source?.product_price ?? source?.amount ?? '').trim();
  const currency = String(source?.currency || source?.currency_code || '').trim().toUpperCase();
  // Zapier's built-in Payhip sample can be mapped without its hidden skip marker.
  return key === '796T' && title === 'my ebook' && rawPrice === '1100' && currency === 'USD';
}

function parsePrice(source) {
  const raw = source.price ?? source.product_price ?? source.amount;
  const value = Number(String(raw ?? '').replace(/[^\d.,-]/g, '').replace(',', '.'));
  if (!Number.isFinite(value) || value < 0) return null;
  return Number.isInteger(value) && value > 0 ? value / 100 : value;
}

function normalizeProduct(input) {
  const source = input?.product && typeof input.product === 'object' ? input.product : input;
  if (!source || typeof source !== 'object') return null;
  const key = extractProductKey(source);
  const title = String(source.product_name || source.name || source.title || '').trim();
  const price = parsePrice(source);
  const sourceUrl = String(source.product_url || source.product_permalink || source.url || '').trim();
  const image = String(source.product_image || source.image_url || source.cover || source.image || '').trim();
  if (!key || !title || price === null || !/^https:\/\/(?:www\.)?payhip\.com\//i.test(sourceUrl || `https://payhip.com/b/${key}`)) return null;
  const description = String(source.product_description || source.description || '').trim();
  const haystack = `${title} ${description}`.toLowerCase();
  const isBeauty = /beauty|salon|lash|nail|esthetic|skincare|hair|makeup|maquillage|ongle|beauté|cils/.test(haystack);
  const isTemplate = /template|canva|powerpoint|design|social media/.test(haystack);
  const isBundle = /bundle|collection|starter kit|toolkit|pack complet/.test(haystack);
  const group = isTemplate ? 'Templates & Documents' : (isBundle ? 'Kits & Bundles' : 'Learning & Guides');
  const family = isTemplate ? 'templates-documents' : (isBundle ? 'kits-bundles' : 'learning-guides');
  const language = /[àâçéèêëîïôùûüÿœ]/i.test(`${title} ${description.slice(0, 500)}`) ? 'fr' : 'en';
  return {
    id: `payhip-${key}`,
    payhipProductKey: key,
    title,
    shortDescription: (description.split(/\n\s*\n|[.!?]\s/)[0] || title).slice(0, 220),
    description: description || title,
    category: group,
    productGroup: group,
    productFamily: family,
    productType: isTemplate ? 'templates' : (isBundle ? 'all-in-one-kit' : 'guidebook'),
    audience: isBeauty ? 'Beauty professionals' : 'Lifestyle & Hobbyist',
    subcategory: isBeauty ? 'FASHION & BEAUTY' : 'BUSINESS & MONEY',
    language,
    price,
    currency: String(source.currency || source.currency_code || 'EUR').toUpperCase(),
    isFree: price === 0,
    formats: ['Digital download'],
    cover: image || undefined,
    status: 'published',
    purchaseUrl: sourceUrl || `https://payhip.com/b/${key}`,
    payhipAutoImported: true
  };
}

function decodeHtml(value) {
  return String(value || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function metaContent(html, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, 'i')
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return '';
}

async function enrichFromPublicPage(product) {
  if (product.cover && product.description !== product.title) return product;
  try {
    const response = await fetch(product.purchaseUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return product;
    const html = await response.text();
    const cover = metaContent(html, 'og:image');
    const description = metaContent(html, 'og:description') || metaContent(html, 'description');
    return {
      ...product,
      cover: product.cover || (cover.startsWith('https://') ? cover : undefined),
      description: product.description !== product.title ? product.description : (description || product.description),
      shortDescription: product.shortDescription !== product.title ? product.shortDescription : (description || product.shortDescription)
    };
  } catch {
    return product;
  }
}

export default async function payhipProducts(request) {
  const store = getStore(STORE_NAME);
  const url = new URL(request.url);

  if (request.method === 'POST') {
    if (!isAuthorized(request, readSecret())) return json({ error: 'Unauthorized.' }, 401);
    try {
      const payload = await request.json();
      if (isZapierPlaceholder(payload?.product && typeof payload.product === 'object' ? payload.product : payload)) {
        return json({ ok: true, skipped: true, reason: 'Zapier placeholder test records are ignored.' });
      }
      let product = normalizeProduct(payload);
      if (!product) return json({ error: 'Product data is incomplete or invalid.' }, 400);
      product = await enrichFromPublicPage(product);
      await store.setJSON(product.id, product);
      return json({ ok: true, id: product.id, hasCover: Boolean(product.cover) }, 201);
    } catch {
      return json({ error: 'Product could not be saved.' }, 400);
    }
  }

  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
  const productKey = (url.searchParams.get('product_key') || '').replace(/^payhip-/, '');
  if (productKey) {
    const product = await store.get(`payhip-${productKey}`, { type: 'json' });
    return json({ products: product ? [product] : [], count: product ? 1 : 0 }, 200, true);
  }
  const { blobs } = await store.list();
  const products = (await Promise.all(blobs.map(({ key }) => store.get(key, { type: 'json' }))))
    .filter((product) => product?.status === 'published');
  return json({ products, count: products.length }, 200, true);
}

export const config = { path: '/api/payhip-products', method: ['GET', 'POST'] };
