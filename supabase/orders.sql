create table if not exists public.orders (
  stripe_session_id text primary key,
  product_id text not null,
  customer_email text not null,
  payment_intent_id text,
  amount_total integer not null,
  currency text not null,
  payment_status text not null check (payment_status in ('paid')),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
revoke all on public.orders from public, anon, authenticated;
grant all on public.orders to service_role;
