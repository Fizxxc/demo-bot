-- Jalankan file ini di Supabase SQL Editor.
-- Skema dibuat untuk multi-tenant: 1 deploy/script bisa dipakai banyak owner bot.

create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_telegram_id bigint not null,
  bot_token text not null,
  bot_username text,
  store_name text not null default 'Kograph Market',
  welcome_image_url text,
  is_active boolean not null default false,
  webhook_secret text not null default encode(gen_random_bytes(24), 'hex'),
  pakasir_project_slug text,
  pakasir_api_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  telegram_user_id bigint not null,
  username text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, telegram_user_id)
);

create table if not exists public.balances (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  amount integer not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  price integer not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists public.product_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  username text not null,
  password text not null,
  tipe text,
  extra text,
  status text not null default 'available' check (status in ('available', 'sold', 'disabled')),
  sold_to_customer_id uuid references public.customers(id) on delete set null,
  sold_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  total_amount integer not null check (total_amount >= 0),
  status text not null default 'paid' check (status in ('paid', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  qty integer not null check (qty > 0),
  unit_price integer not null check (unit_price >= 0),
  accounts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  type text not null check (type in ('DEPOSIT', 'BELI', 'REFUND', 'ADJUSTMENT')),
  amount integer not null,
  description text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.bot_sessions (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  telegram_user_id bigint not null,
  state text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, telegram_user_id)
);

create table if not exists public.payment_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  provider text not null default 'pakasir' check (provider in ('pakasir', 'doku')),
  order_id text not null unique,
  amount integer not null check (amount > 0),
  fee integer not null default 0 check (fee >= 0),
  total_payment integer not null check (total_payment > 0),
  payment_method text not null default 'qris',
  payment_number text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'canceled', 'failed')),
  expired_at timestamptz,
  paid_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_tenant on public.products(tenant_id);
create index if not exists idx_accounts_available on public.product_accounts(tenant_id, product_id, status);
create index if not exists idx_transactions_customer on public.transactions(tenant_id, customer_id, created_at desc);
create index if not exists idx_invoices_status on public.payment_invoices(tenant_id, status, created_at desc);

create or replace view public.product_stock as
select
  p.*,
  count(a.id) filter (where a.status = 'available')::integer as stock
from public.products p
left join public.product_accounts a on a.product_id = p.id and a.tenant_id = p.tenant_id
group by p.id;

create or replace function public.purchase_product(
  p_tenant_id uuid,
  p_telegram_user_id bigint,
  p_product_id uuid,
  p_qty integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers%rowtype;
  v_balance public.balances%rowtype;
  v_product public.products%rowtype;
  v_accounts jsonb;
  v_stock integer;
  v_total integer;
  v_remaining integer;
  v_order_id uuid;
begin
  if p_qty is null or p_qty < 1 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_qty');
  end if;

  select * into v_customer
  from public.customers
  where tenant_id = p_tenant_id and telegram_user_id = p_telegram_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'customer_not_found');
  end if;

  select * into v_product
  from public.products
  where id = p_product_id and tenant_id = p_tenant_id and is_active = true
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'product_not_found');
  end if;

  v_total := v_product.price * p_qty;

  select * into v_balance
  from public.balances
  where customer_id = v_customer.id
  for update;

  if not found then
    insert into public.balances(customer_id, tenant_id, amount)
    values (v_customer.id, p_tenant_id, 0)
    returning * into v_balance;
  end if;

  if v_balance.amount < v_total then
    return jsonb_build_object(
      'ok', false,
      'reason', 'insufficient_balance',
      'current_balance', v_balance.amount,
      'total_required', v_total
    );
  end if;

  select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) into v_accounts
  from (
    select id, username, password, tipe, extra
    from public.product_accounts
    where tenant_id = p_tenant_id
      and product_id = p_product_id
      and status = 'available'
    order by created_at asc
    for update skip locked
    limit p_qty
  ) s;

  v_stock := jsonb_array_length(v_accounts);

  if v_stock < p_qty then
    return jsonb_build_object('ok', false, 'reason', 'insufficient_stock', 'stock', v_stock);
  end if;

  insert into public.orders(tenant_id, customer_id, total_amount, status)
  values (p_tenant_id, v_customer.id, v_total, 'paid')
  returning id into v_order_id;

  update public.product_accounts
  set status = 'sold', sold_to_customer_id = v_customer.id, sold_at = now()
  where id in (
    select (item->>'id')::uuid
    from jsonb_array_elements(v_accounts) as item
  );

  update public.balances
  set amount = amount - v_total, updated_at = now()
  where customer_id = v_customer.id
  returning amount into v_remaining;

  insert into public.order_items(tenant_id, order_id, product_id, qty, unit_price, accounts)
  values (p_tenant_id, v_order_id, p_product_id, p_qty, v_product.price, v_accounts);

  insert into public.transactions(tenant_id, customer_id, type, amount, description, meta)
  values (
    p_tenant_id,
    v_customer.id,
    'BELI',
    v_total,
    v_product.name || ' x' || p_qty,
    jsonb_build_object('order_id', v_order_id, 'product_id', p_product_id, 'qty', p_qty)
  );

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'product_id', p_product_id,
    'product_name', v_product.name,
    'qty', p_qty,
    'total_amount', v_total,
    'remaining_balance', v_remaining,
    'accounts', v_accounts
  );
end;
$$;

create or replace function public.credit_paid_invoice(
  p_invoice_id uuid,
  p_paid_at timestamptz default now(),
  p_raw jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.payment_invoices%rowtype;
  v_balance public.balances%rowtype;
  v_new_balance integer;
begin
  select * into v_invoice
  from public.payment_invoices
  where id = p_invoice_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invoice_not_found');
  end if;

  select * into v_balance
  from public.balances
  where customer_id = v_invoice.customer_id
  for update;

  if not found then
    insert into public.balances(customer_id, tenant_id, amount)
    values (v_invoice.customer_id, v_invoice.tenant_id, 0)
    returning * into v_balance;
  end if;

  if v_invoice.status = 'paid' then
    return jsonb_build_object(
      'ok', true,
      'already_paid', true,
      'tenant_id', v_invoice.tenant_id,
      'customer_id', v_invoice.customer_id,
      'amount', v_invoice.amount,
      'new_balance', v_balance.amount
    );
  end if;

  if v_invoice.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'invoice_not_pending', 'status', v_invoice.status);
  end if;

  update public.balances
  set amount = amount + v_invoice.amount, updated_at = now()
  where customer_id = v_invoice.customer_id
  returning amount into v_new_balance;

  update public.payment_invoices
  set status = 'paid', paid_at = coalesce(p_paid_at, now()), raw = raw || p_raw, updated_at = now()
  where id = v_invoice.id;

  insert into public.transactions(tenant_id, customer_id, type, amount, description, meta)
  values (
    v_invoice.tenant_id,
    v_invoice.customer_id,
    'DEPOSIT',
    v_invoice.amount,
    'Deposit Pakasir QRIS',
    jsonb_build_object('invoice_id', v_invoice.id, 'order_id', v_invoice.order_id, 'provider', v_invoice.provider)
  );

  return jsonb_build_object(
    'ok', true,
    'already_paid', false,
    'tenant_id', v_invoice.tenant_id,
    'customer_id', v_invoice.customer_id,
    'amount', v_invoice.amount,
    'new_balance', v_new_balance
  );
end;
$$;

-- =========================
-- WEB PLATFORM + OWNER DASHBOARD
-- =========================

create table if not exists public.web_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  name text not null,
  password_hash text not null,
  password_salt text not null,
  role text not null default 'merchant' check (role in ('owner', 'merchant')),
  status text not null default 'pending_payment' check (status in ('pending_payment', 'active', 'blocked', 'suspended')),
  plan_code text check (plan_code in ('basic', 'plus', 'promax')),
  plan_started_at timestamptz,
  plan_expires_at timestamptz,
  tenant_id uuid references public.tenants(id) on delete set null,
  blocked_reason text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.web_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.web_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.plan_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.web_users(id) on delete cascade,
  plan_code text not null check (plan_code in ('basic', 'plus', 'promax')),
  order_id text not null unique,
  amount integer not null,
  fee integer not null default 0,
  total_payment integer not null,
  payment_number text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'canceled', 'failed')),
  raw jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchant_wallets (
  user_id uuid primary key references public.web_users(id) on delete cascade,
  merchant_balance integer not null default 0 check (merchant_balance >= 0),
  available_balance integer not null default 0 check (available_balance >= 0),
  lifetime_revenue integer not null default 0 check (lifetime_revenue >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchant_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.web_users(id) on delete cascade,
  order_id text not null unique,
  amount integer not null check (amount > 0),
  fee integer not null default 0,
  total_payment integer not null,
  payment_number text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'canceled', 'failed')),
  raw jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchant_ewallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.web_users(id) on delete cascade,
  provider text not null check (provider in ('gopay', 'dana', 'shopeepay', 'ovo')),
  account_number text not null,
  account_name text not null,
  status text not null default 'pending' check (status in ('pending', 'valid', 'rejected')),
  reviewed_by uuid references public.web_users(id) on delete set null,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.web_users(id) on delete cascade,
  ewallet_id uuid not null references public.merchant_ewallets(id) on delete restrict,
  amount integer not null check (amount > 0),
  service_fee integer not null check (service_fee >= 0),
  net_amount integer not null check (net_amount > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  note text,
  reviewed_by uuid references public.web_users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.terminal_logs (
  id bigserial primary key,
  user_id uuid references public.web_users(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  type text not null,
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'error')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.security_events (
  id bigserial primary key,
  user_id uuid references public.web_users(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  type text not null,
  severity text not null default 'info',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.owner_notifications (
  id bigserial primary key,
  user_id uuid references public.web_users(id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.live_chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.web_users(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  last_owner_reply_at timestamptz,
  last_user_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.live_chat_threads(id) on delete cascade,
  sender_role text not null check (sender_role in ('merchant', 'owner', 'ai')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_web_users_role_status on public.web_users(role, status);
create index if not exists idx_web_users_auth_user_id on public.web_users(auth_user_id);
create index if not exists idx_plan_purchases_order on public.plan_purchases(order_id);
create index if not exists idx_merchant_deposits_order on public.merchant_deposits(order_id);
create index if not exists idx_withdrawals_user_created on public.withdrawals(user_id, created_at desc);
create index if not exists idx_terminal_logs_user on public.terminal_logs(user_id, created_at desc);
create index if not exists idx_owner_notifications_created on public.owner_notifications(created_at desc);

create or replace function public.credit_merchant_wallet_on_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from public.web_users
  where tenant_id = new.tenant_id and role = 'merchant'
  limit 1;

  if v_user_id is not null then
    insert into public.merchant_wallets(user_id, merchant_balance, available_balance, lifetime_revenue)
    values (v_user_id, new.total_amount, 0, new.total_amount)
    on conflict (user_id) do update
      set merchant_balance = public.merchant_wallets.merchant_balance + excluded.merchant_balance,
          lifetime_revenue = public.merchant_wallets.lifetime_revenue + excluded.lifetime_revenue,
          updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_credit_merchant_wallet_on_order on public.orders;
create trigger trg_credit_merchant_wallet_on_order
after insert on public.orders
for each row
when (new.status = 'paid')
execute function public.credit_merchant_wallet_on_order();
