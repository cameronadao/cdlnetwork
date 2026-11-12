# CDL Network direct digital sales

The site now has a Netlify Functions + Stripe Managed Payments Checkout flow with private Supabase Storage delivery. It is intentionally dormant until its provider accounts and a product's private files are configured. Products without `"checkoutProvider": "stripe"` keep their current purchase link.

## Required account configuration

Add these values in Netlify Project configuration → Environment variables. Keep all keys in Netlify, never in website JavaScript or committed files:

- `STRIPE_SECRET_KEY` — Stripe secret key for the selected mode (test first).
- `STRIPE_WEBHOOK_SECRET` — signing secret for the webhook destination below.
- `STRIPE_API_VERSION` — optional; defaults to `2026-10-28.endive`, which supports Managed Payments.
- `STRIPE_MANAGED_PAYMENTS` is not a switch: the integration explicitly requests Managed Payments for each enabled product, and Stripe must have activated it on your account.
- `SUPABASE_URL` — Supabase project URL (for this project: `https://jmxivoovpzhxcodnvgnp.supabase.co`).
- `SUPABASE_SECRET_KEY` — server-only Supabase secret key (`sb_secret_...`). The code also accepts the legacy `SUPABASE_SERVICE_ROLE_KEY` temporarily. Secret keys bypass RLS and must stay only in Netlify, never in browser code or Git.
- `SUPABASE_BUCKET` — name of a **private** Storage bucket for digital products.
- `RESEND_API_KEY` — Resend API key for delivery email.
- `RESEND_FROM_EMAIL` — verified sender address, for example `CDL Network <downloads@your-domain>`.
- `SITE_URL` — canonical site origin, for example `https://cdlnetwork.netlify.app`.

After adding or changing Netlify variables, redeploy the site.

## Configure the services

1. Run [`supabase/orders.sql`](supabase/orders.sql) in the Supabase SQL editor.
2. Create a private Supabase Storage bucket and upload product deliverables into it. Do not put paid files in the website's public `assets` folder.
3. In Stripe Dashboard → Settings → Managed Payments, review the terms and pricing and activate the product if Stripe offers it to your account. Eligibility is determined by Stripe.
4. Verify the sender domain in Resend.
5. In Stripe, create a webhook destination at `https://cdlnetwork.netlify.app/api/stripe-webhook` (or the configured production domain) for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Store its signing secret in `STRIPE_WEBHOOK_SECRET`.
6. Add each product's files to `netlify/functions/_shared/delivery-assets.json`. Example:

```json
{
  "product-id-from-products-json": [
    { "name": "Guide.pdf", "path": "product-id-from-products-json/Guide.pdf" },
    { "name": "Guide.epub", "path": "product-id-from-products-json/Guide.epub" }
  ]
}
```

7. In `netlify/functions/_shared/stripe-products.json`, map each product ID to a Stripe Price ID, the eligible tax code assigned to its Stripe Product, and the Price tax behavior. As you confirmed, every site price is TTC, so use `inclusive` for all direct-sale Prices. Example:

```json
{
  "product-id-from-products-json": {
    "priceId": "price_...",
    "taxCode": "txcd_10302000",
    "taxBehavior": "inclusive"
  }
}
```

Choose each tax code in Stripe based on what the product actually is; do not copy the example code automatically. Stripe currently lists digital books, downloadable documents, downloadable artwork, and downloadable software under distinct tax codes. Managed Payments adds tax on top of a Price by default unless you set the Price tax behavior to inclusive. The checkout code therefore blocks direct sales unless the Stripe Price is tax-inclusive.

8. In `data/products.json`, add `"checkoutProvider": "stripe"` only to products whose private files, delivery mapping, Managed Payments product, price, and tax code are ready. The backend verifies the Stripe price amount, currency, tax code, and tax-inclusive setting; the browser cannot set the amount.
9. Test with Stripe test mode and a real private test file before enabling live mode.

## Flow and safeguards

- `/api/checkout` accepts a product ID only, then reads the published product price and currency on the server.
- Stripe sends signed payment events to `/api/stripe-webhook`. The function verifies the signature before recording a paid order and sending the download email.
- `/api/order-download` independently retrieves the Checkout Session from Stripe and requires `payment_status=paid` before signing private Storage URLs. Links expire after 24 hours.
- The checkout button remains on Payhip/Etsy until the product is explicitly switched to Stripe.

Managed Payments is designed for eligible digital products and makes Stripe the merchant of record for supported transactions. Stripe reviews account eligibility and requires an approved product tax code. Direct digital goods also need to be sold by you, with the required distribution rights. Products that involve professional services are not eligible. The current Stripe Dashboard for this account displays an additional 3.5% fee per transaction; confirm the full pricing and terms before activating Managed Payments.
