import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const productsPath = resolve(process.cwd(), 'data/products.json');
const assetsPath = resolve(process.cwd(), 'netlify/functions/_shared/delivery-assets.json');
const stripeProductsPath = resolve(process.cwd(), 'netlify/functions/_shared/stripe-products.json');

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export async function getProducts() {
  return JSON.parse(await readFile(productsPath, 'utf8'));
}

export async function getDeliveryAssets() {
  return JSON.parse(await readFile(assetsPath, 'utf8'));
}

export async function getStripeProducts() {
  return JSON.parse(await readFile(stripeProductsPath, 'utf8'));
}

export function getSiteUrl() {
  const previewUrl = process.env.CONTEXT === 'deploy-preview' ? process.env.DEPLOY_PRIME_URL : '';
  const value = previewUrl || process.env.SITE_URL || process.env.URL || 'https://cdlnetwork.netlify.app';
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') throw new Error('SITE_URL must use HTTPS.');
  return url.origin;
}

export function requiredEnvironment() {
  const keys = [
    'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SUPABASE_URL',
    'SUPABASE_BUCKET', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL'
  ];
  const missing = keys.filter((key) => !process.env[key]);
  if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push('SUPABASE_SECRET_KEY');
  }
  return missing;
}

export function supabaseAuthHeaders(extra = {}) {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const key = secretKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    ...(secretKey ? {} : { authorization: `Bearer ${key}` }),
    ...extra
  };
}

export function getProductAssets(productId, manifest) {
  const entries = manifest?.[productId];
  if (!Array.isArray(entries)) return [];
  return entries.filter((entry) => entry && typeof entry.path === 'string' && entry.path && typeof entry.name === 'string' && entry.name);
}

export async function createSignedDownloads(productId) {
  const manifest = await getDeliveryAssets();
  const entries = getProductAssets(productId, manifest);
  if (!entries.length) throw new Error(`No private delivery files are configured for ${productId}.`);

  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const bucket = encodeURIComponent(process.env.SUPABASE_BUCKET);
  const links = [];
  for (const entry of entries) {
    // Match Supabase Storage's SDK: encode each object path segment before
    // requesting a signature, then encode the completed URL for display/use.
    const objectPath = entry.path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
    const response = await fetch(`${base}/storage/v1/object/sign/${bucket}/${objectPath}`, {
      method: 'POST',
      headers: supabaseAuthHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ expiresIn: 86400 })
    });
    if (!response.ok) throw new Error(`Private file signing failed (${response.status}).`);
    const data = await response.json();
    const signedUrl = data.signedURL || data.signedUrl;
    if (!signedUrl) throw new Error('Storage did not return a signed download URL.');
    const downloadUrl = /^https?:\/\//i.test(signedUrl)
      ? signedUrl
      : `${base}/storage/v1${signedUrl.startsWith('/') ? signedUrl : `/${signedUrl}`}`;
    // Supabase may return an already-escaped object path (for example `%3A`)
    // alongside literal spaces. Encode spaces without escaping those existing
    // path escapes a second time, or Storage verifies a different object path.
    const safeDownloadUrl = encodeURI(downloadUrl).replace(/%25(?=[0-9a-f]{2})/gi, '%');
    links.push({ name: entry.name, url: safeDownloadUrl });
  }
  return links;
}

export async function stripeRequest(path, options = {}) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'stripe-version': process.env.STRIPE_API_VERSION || '2026-10-28.endive',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Stripe request failed (${response.status}).`);
  return data;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}
