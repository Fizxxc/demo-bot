-- Jalankan file ini di Supabase SQL Editor untuk menambah log webhook payment.
-- Aman untuk database lama: hanya membuat tabel baru jika belum ada.

create table if not exists public.payment_webhook_logs (
  id bigserial primary key,
  provider text not null default 'pakasir',
  order_id text,
  amount integer,
  project text,
  status text,
  payload jsonb not null default '{}'::jsonb,
  matched_table text,
  matched_id uuid,
  response_status integer,
  response_body jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_webhook_logs_order_id
  on public.payment_webhook_logs(order_id);

create index if not exists idx_payment_webhook_logs_created_at
  on public.payment_webhook_logs(created_at desc);
