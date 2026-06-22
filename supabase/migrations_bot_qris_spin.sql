-- Bot update: direct QRIS product payments + paid lucky spin.
-- Aman dijalankan berulang, tidak menghapus data lama.

create table if not exists public.direct_order_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  qty integer not null check (qty > 0),
  order_id text not null unique,
  amount integer not null check (amount > 0),
  fee integer not null default 0 check (fee >= 0),
  total_payment integer not null check (total_payment > 0),
  payment_number text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'canceled', 'failed')),
  order_result jsonb not null default '{}'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_direct_order_invoices_order_id on public.direct_order_invoices(order_id);
create index if not exists idx_direct_order_invoices_customer on public.direct_order_invoices(customer_id, created_at desc);
create index if not exists idx_direct_order_invoices_status on public.direct_order_invoices(tenant_id, status, created_at desc);

create table if not exists public.spin_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  order_id text unique,
  tier_amount integer not null check (tier_amount in (1000, 2000, 3000, 5000)),
  spin_count integer not null default 1 check (spin_count >= 1 and spin_count <= 20),
  pay_method text not null check (pay_method in ('saldo', 'qris')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'canceled', 'failed')),
  result text check (result in ('win', 'zonk')),
  prize_id uuid,
  fee integer not null default 0 check (fee >= 0),
  total_payment integer not null default 0 check (total_payment >= 0),
  payment_number text,
  raw jsonb not null default '{}'::jsonb,
  results jsonb not null default '[]'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_spin_orders_order_id on public.spin_orders(order_id);
create index if not exists idx_spin_orders_customer on public.spin_orders(customer_id, created_at desc);
create index if not exists idx_spin_orders_status on public.spin_orders(tenant_id, status, created_at desc);
create index if not exists idx_spin_orders_batch on public.spin_orders(tenant_id, spin_count, created_at desc);

create table if not exists public.spin_prizes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  tier_min integer not null default 1000 check (tier_min in (1000, 2000, 3000, 5000)),
  reward_text text not null,
  reward_type text not null default 'text' check (reward_type in ('text', 'balance')),
  balance_amount integer not null default 0 check (balance_amount >= 0 and balance_amount <= 100000),
  note text,
  status text not null default 'available' check (status in ('available', 'won', 'disabled')),
  won_by_customer_id uuid references public.customers(id) on delete set null,
  won_spin_order_id uuid,
  won_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_spin_prizes_available on public.spin_prizes(tenant_id, tier_min, status, created_at);
create index if not exists idx_spin_prizes_winner on public.spin_prizes(won_by_customer_id, won_at desc);
create index if not exists idx_spin_prizes_reward_type on public.spin_prizes(tenant_id, reward_type, status);
