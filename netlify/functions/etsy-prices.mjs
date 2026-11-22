const ETSY_LISTING_IDS = new Set(['4517484275', '4622518758', '4622702952', '4617847784']);

function json(body, status, cache = false) {
  const headers = { 'content-type': 'application/json; charset=utf-8' };
  if (cache) {
    headers['cache-control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600';
    headers['netlify-cdn-cache-control'] = 'public, s-maxage=300, stale-while-revalidate=3600';
  } else {
    headers['cache-control'] = 'no-store';
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function readEtsyApiKey() {
  try {
    return Netlify.env.get('ETSY_API_KEY') || process.env.ETSY_API_KEY || '';
  } catch {
    return process.env.ETSY_API_KEY || '';
  }
}

function normalizePrice(price, taxable = true) {
  if (typeof price === 'number') return { amount: price, currency: 'EUR' };
  const amount = Number(price?.amount);
  const divisor = Number(price?.divisor);
  const currency = String(price?.currency_code || '').toUpperCase();
  if (!Number.isFinite(amount) || !Number.isFinite(divisor) || divisor <= 0 || !/^[A-Z]{3}$/.test(currency)) return null;
  const value = amount / divisor;
  if (!Number.isFinite(value) || value <= 0) return null;
  // Etsy's API price is before VAT; the French storefront shows the consumer price including 20% VAT.
  const displayAmount = currency === 'EUR' && taxable ? Math.round((value * 1.2 + Number.EPSILON) * 100) / 100 : value;
  return { amount: displayAmount, currency };
}

export default async function etsyPrices(request) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);

  const apiKey = readEtsyApiKey();
  if (!apiKey || !apiKey.includes(':')) return json({ error: 'Etsy price sync is not configured.' }, 503);

  const requestedIds = new URL(request.url).searchParams.getAll('id')
    .flatMap((value) => value.split(','))
    .filter((id) => ETSY_LISTING_IDS.has(id));
  const listingIds = [...new Set(requestedIds.length ? requestedIds : ETSY_LISTING_IDS)];

  const results = await Promise.allSettled(listingIds.map(async (listingId) => {
    const response = await fetch(`https://openapi.etsy.com/v3/application/listings/${listingId}`, {
      headers: { 'x-api-key': apiKey, accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`Etsy listing request failed (${response.status}).`);
    const listing = await response.json();
    const price = normalizePrice(listing.price, listing.is_taxable !== false);
    if (String(listing.listing_id) !== listingId || !price) throw new Error('Etsy returned invalid listing data.');
    return [listingId, price];
  }));

  const prices = Object.fromEntries(results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value));
  if (!Object.keys(prices).length) return json({ error: 'Etsy prices are temporarily unavailable.' }, 502);
  return json({ prices }, 200, true);
}

export const config = { path: '/api/etsy-prices', method: 'GET' };
