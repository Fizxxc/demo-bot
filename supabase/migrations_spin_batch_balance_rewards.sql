-- Bot Lucky Spin update: batch spin + hadiah saldo sampai Rp100.000.
-- Aman dijalankan berulang, tidak menghapus data lama.

alter table public.spin_orders
  add column if not exists spin_count integer not null default 1 check (spin_count >= 1 and spin_count <= 20);

alter table public.spin_orders
  add column if not exists results jsonb not null default '[]'::jsonb;

alter table public.spin_prizes
  add column if not exists reward_type text not null default 'text' check (reward_type in ('text', 'balance'));

alter table public.spin_prizes
  add column if not exists balance_amount integer not null default 0 check (balance_amount >= 0 and balance_amount <= 100000);

create index if not exists idx_spin_orders_batch on public.spin_orders(tenant_id, spin_count, created_at desc);
create index if not exists idx_spin_prizes_reward_type on public.spin_prizes(tenant_id, reward_type, status);
