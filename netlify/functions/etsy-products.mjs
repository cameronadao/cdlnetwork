const SHOP_SEED_LISTING_ID = '4622518758';
const ETSY_API_BASE = 'https://openapi.etsy.com/v3/application';
const PAGE_SIZE = 100;
const MAX_LISTINGS = 1000;
const DETAIL_BATCH_SIZE = 8;
const FASHION_BEAUTY_LISTING_IDS = new Set(['4624836019', '4624733718', '4623813287', '4623387359', '4623375699']);
const HIDDEN_LISTING_IDS = new Set(['4475628519', '4475159726']);
const AUDIENCE_OVERRIDES = {
  '4561064631': ['Business Builder', 'Specialists'],
  '4561057643': ['Business Builder', 'Specialists'],
  '4561074930': ['Business Builder', 'Specialists'],
  '4556776979': ['Business Builder', 'Specialists'],
  '4556772568': ['Business Builder', 'Specialists'],
  '4542956167': 'Business Builder',
  '4556937409': 'Specialists',
  '4556212319': 'Spirituality',
  '4556210697': 'Spirituality',
  '4556201877': 'Spirituality',
  '4556203420': 'Spirituality'
};

function json(body, status = 200, cache = false) {
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

async function etsyGet(path, apiKey) {
  const response = await fetch(`${ETSY_API_BASE}${path}`, {
    headers: { 'x-api-key': apiKey, accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`Etsy request failed (${response.status}).`);
  return response.json();
}

function priceForDisplay(price, taxable = true) {
  const amount = Number(price?.amount);
  const divisor = Number(price?.divisor);
  const currency = String(price?.currency_code || '').toUpperCase();
  if (!Number.isFinite(amount) || !Number.isFinite(divisor) || divisor <= 0 || !/^[A-Z]{3}$/.test(currency)) return null;
  const base = amount / divisor;
  if (!Number.isFinite(base) || base < 0) return null;
  const gross = currency === 'EUR' && taxable ? base * 1.2 : base;
  return { amount: Math.round((gross + Number.EPSILON) * 100) / 100, currency };
}

function classifyListing(listing) {
  const text = [listing.title, ...(listing.tags || [])].join(' ').toLowerCase();
  const listingId = String(listing.listing_id || '');
  const isBeauty = /beauty|salon|lash|eyelash|nail|esthetic|skincare|hair|makeup|maquillage|ongle|beauté|cils/.test(text);
  const isSpiritual = /spiritual|bible|prayer|prière|faith|religion|devotional/.test(text);
  const isRelationship = /relationship|dating|rendez-vous|love|couples/.test(text);
  
  let family = 'templates-documents';
  let group = 'Templates & Documents';
  let type = 'templates';
  if (/workbook|cahier|worksheet|exercise|exercice/.test(text)) {
    family = 'learning-guides'; group = 'Learning & Guides'; type = 'workbooks';
  } else if (/ebook|e-book|guide|manual|devotional|cheat sheet|course|formation|tutoriel/.test(text)) {
    family = 'learning-guides'; group = 'Learning & Guides'; type = /manual/.test(text) ? 'manual' : 'guidebook';
  } else if (/planner|planificateur|journal|calendar|calendrier|tracker/.test(text)) {
    family = 'planning-tracking'; group = 'Planning & Tracking';
    type = /journal/.test(text) ? 'journals' : (/calendar|calendrier/.test(text) ? 'calendars' : 'planners');
  } else if (/template|form|canva|powerpoint|price list|social media/.test(text)) {
    family = 'templates-documents'; group = 'Templates & Documents'; type = 'templates';
  } else if (/bundle|collection|starter kit|toolkit|pack complet|coffret/.test(text)) {
    family = 'kits-bundles'; group = 'Kits & Bundles'; type = 'all-in-one-kit';
  } else if (/spreadsheet|excel|calculator|calculateur/.test(text)) {
    family = 'planning-tracking'; group = 'Planning & Tracking'; type = 'planners';
  }

  let audience = 'Business Builder';
  let subcategory = 'BUSINESS & MONEY';
  if (FASHION_BEAUTY_LISTING_IDS.has(listingId) || isBeauty) {
    audience = 'Lifestyle & Hobbyist'; subcategory = 'FASHION & BEAUTY';
  } else if (isSpiritual) {
    audience = 'Spirituality'; subcategory = null;
  } else if (isRelationship) {
    audience = 'Love & Relationships'; subcategory = null;
  } else if (/holiday|christmas|thanksgiving|halloween|seasonal/.test(text)) {
    audience = 'Family & Niches Market'; subcategory = 'HOLIDAYS';
  } else if (/pet|animal/.test(text)) {
    audience = 'Family & Niches Market'; subcategory = 'PETS & ANIMALS';
  } else if (/parent|family|families|kids|children|child|coloring book/.test(text)) {
    audience = 'Family & Niches Market'; subcategory = 'PARENTING';
  } else if (/audiobook|audio book/.test(text)) {
    audience = 'Specialists'; subcategory = 'AUDIOBOOKS';
  } else if (/language learning|learn english|learn french|language course/.test(text)) {
    audience = 'Specialists'; subcategory = 'LANGUAGE LEARNING';
  } else if (/plr|print on demand|print-on-demand/.test(text)) {
    audience = 'Specialists'; subcategory = 'PLR & PRINT ON DEMAND';
  } else if (/canva|planner|planificateur|journal|tracker/.test(text)) {
    audience = 'Specialists'; subcategory = 'CANVA PLANNERS';
  } else if (/seo|search engine optimization|traffic/.test(text)) {
    audience = 'Digital Creators'; subcategory = 'SEO';
  } else if (/blog|blogging/.test(text)) {
    audience = 'Digital Creators'; subcategory = 'BLOGGING';
  } else if (/writing|writer|publishing|écriture|édition/.test(text)) {
    audience = 'Digital Creators'; subcategory = 'WRITING & PUBLISHING';
  } else if (/instagram|social media|réseaux sociaux|tiktok|pinterest|faceless/.test(text)) {
    audience = 'Digital Creators'; subcategory = 'SOCIAL MEDIA & NETWORKING';
  } else if (/internet marketing|online marketing/.test(text)) {
    audience = 'Business Builder'; subcategory = 'INTERNET MARKETING';
  } else if (/e-?commerce|online store|shopify/.test(text)) {
    audience = 'Business Builder'; subcategory = 'ECOMMERCE';
  } else if (/affiliate/.test(text)) {
    audience = 'Business Builder'; subcategory = 'AFFILIATE MARKETING';
  } else if (/freelance|freelancer/.test(text)) {
    audience = 'Business Builder'; subcategory = 'FREELANCE';
  } else if (/marketing|seo|content strategy|advertising/.test(text)) {
    audience = 'Business Builder'; subcategory = 'MARKETING';
  } else if (/internet|website|web design/.test(text)) {
    audience = 'Specialists'; subcategory = 'INTERNET';
  } else if (/technology|tech|artificial intelligence|\bai\b|software|computer|digital tools|learning guide|how to/.test(text)) {
    audience = 'Specialists'; subcategory = 'TECHNOLOGY & LEARNING';
  } else if (/diet|nutrition|meal plan/.test(text)) {
    audience = 'Lifestyle & Hobbyist'; subcategory = 'DIET & COOKING';
  } else if (/recipe|cooking|cookbook|cuisine/.test(text)) {
    audience = 'Lifestyle & Hobbyist'; subcategory = 'COOKING & RECIPES';
  } else if (/music|song|guitar|piano/.test(text)) {
    audience = 'Lifestyle & Hobbyist'; subcategory = 'MUSIC';
  } else if (/travel|voyage|vacation|trip/.test(text)) {
    audience = 'Lifestyle & Hobbyist'; subcategory = 'LIFESTYLE & TRAVEL';
  } else if (/hobby|craft|diy|free time/.test(text)) {
    audience = 'Lifestyle & Hobbyist'; subcategory = 'HOBBIES & FREE TIME';
  } else if (/sport|outdoor/.test(text)) {
    audience = 'Lifestyle & Hobbyist'; subcategory = 'SPORTS & OUTDOORS';
  } else if (/health|fitness|self improvement|personal development|self-help/.test(text)) {
    audience = 'Personal Growth'; subcategory = /health|fitness/.test(text) ? 'HEALTH & FITNESS' : 'SELF IMPROVEMENT';
  } else if (/business|money|finance|entrepreneur|startup/.test(text)) {
    audience = 'Business Builder'; subcategory = 'BUSINESS & MONEY';
  }

  const override = AUDIENCE_OVERRIDES[listingId];
  return {
    category: group,
    productGroup: group,
    productFamily: family,
    productType: type,
    audience: override || audience,
    subcategory
  };
}
function normalizeListing(listing) {
  const listingId = String(listing?.listing_id || '');
  const price = priceForDisplay(listing?.price, listing?.is_taxable !== false);
  const image = Array.isArray(listing?.images) ? listing.images[0] : null;
  const cover = image?.url_fullxfull || image?.url_570xN || '';
  if (!/^\d+$/.test(listingId) || !price || !listing.title || !cover || listing.listing_type !== 'download') return null;
  const languageCode = String(listing.language || 'en').toLowerCase().slice(0, 2);
  const language = ['en', 'fr'].includes(languageCode) ? languageCode : 'en';
  const titleText = String(listing.title).trim();
  const description = String(listing.description || '').trim().slice(0, 3000);
  const shortDescription = (description.split(/\n\s*\n|[.!?]\s/)[0] || titleText).slice(0, 220);
  const listingUrl = `https://www.etsy.com/${language}/listing/${listingId}`;
  const publishedTimestamp = Number(listing.original_creation_timestamp || listing.creation_timestamp || 0);
  return {
    id: `etsy-${listingId}`,
    etsyListingId: listingId,
    title: titleText,
    shortDescription,
    description: description || shortDescription,
    ...classifyListing(listing),
    language,
    price: price.amount,
    currency: price.currency,
    formats: ['Digital download'],
    publishedAt: publishedTimestamp ? new Date(publishedTimestamp * 1000).toISOString() : new Date().toISOString(),
    cover,
    status: 'published',
    purchaseUrl: listingUrl,
    listingTags: Array.isArray(listing.tags) ? listing.tags : [],
    etsyAutoImported: true
  };
}

export default async function etsyProducts(request) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
  const apiKey = readEtsyApiKey();
  if (!apiKey || !apiKey.includes(':')) return json({ error: 'Etsy product sync is not configured.' }, 503);

  try {
    const seed = await etsyGet(`/listings/${SHOP_SEED_LISTING_ID}`, apiKey);
    const shopId = String(seed?.shop_id || '');
    if (!/^\d+$/.test(shopId)) return json({ error: 'Etsy shop could not be identified.' }, 502);

    const params = new URL(request.url).searchParams;
    const requestedId = (params.get('listing_id') || '').replace(/^etsy-/, '');
    let listings = [];
    let total = 0;
    if (requestedId) {
      if (!/^\d+$/.test(requestedId)) return json({ error: 'Invalid Etsy listing ID.' }, 400);
      const listing = await etsyGet(`/listings/${requestedId}?includes=Images`, apiKey);
      if (String(listing.shop_id) !== shopId || listing.state !== 'active') return json({ products: [] }, 200, true);
      listings = [listing];
    } else {
      for (let offset = 0; offset < MAX_LISTINGS; offset += PAGE_SIZE) {
        const page = await etsyGet(`/shops/${shopId}/listings/active?limit=${PAGE_SIZE}&offset=${offset}&sort_on=created&sort_order=desc`, apiKey);
        const results = Array.isArray(page.results) ? page.results : [];
        listings.push(...results);
        total = Number(page.count) || listings.length;
        if (!results.length || listings.length >= total || listings.length >= MAX_LISTINGS) break;
      }

      // Etsy's shop listings response omits image objects even with includes=Images.
      // Fetch each active digital listing's detail so the catalogue gets its real cover.
      for (let index = 0; index < listings.length; index += DETAIL_BATCH_SIZE) {
        const batch = listings.slice(index, index + DETAIL_BATCH_SIZE);
        const details = await Promise.all(batch.map(async (listing) => {
          if (listing.state !== 'active' || listing.listing_type !== 'download') return listing;
          try {
            return await etsyGet(`/listings/${listing.listing_id}?includes=Images`, apiKey);
          } catch {
            return listing;
          }
        }));
        listings.splice(index, batch.length, ...details);
      }
    }

    const products = listings
      .filter((listing) => String(listing.shop_id) === shopId && listing.state === 'active' && !HIDDEN_LISTING_IDS.has(String(listing.listing_id || '')))
      .map(normalizeListing)
      .filter(Boolean);
    return json({ products, count: products.length }, 200, true);
  } catch {
    return json({ error: 'Etsy products are temporarily unavailable.' }, 502);
  }
}

export const config = { path: '/api/etsy-products', method: 'GET' };
