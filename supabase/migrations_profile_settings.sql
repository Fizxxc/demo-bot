-- Migration aman untuk fitur Profile, push notification, dan preferensi user.
-- Jalankan di Supabase SQL Editor setelah update kode.

alter table public.web_users
  add column if not exists notifications_enabled boolean not null default true;

create index if not exists idx_web_users_notifications_enabled
  on public.web_users(notifications_enabled);
