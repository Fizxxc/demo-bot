-- Jalankan ini untuk project yang SUDAH punya database lama.
-- Aman untuk data lama: hanya menambah kolom/index, tidak menghapus data.

alter table public.web_users
  add column if not exists auth_user_id uuid unique;

create index if not exists idx_web_users_auth_user_id
  on public.web_users(auth_user_id);

-- Setelah deploy kode baru, akun baru akan otomatis dibuat juga di Supabase Auth.
-- Akun lama yang masih hanya ada di web_users akan tersinkron otomatis saat login berhasil,
-- karena sistem masih memverifikasi password lama lalu membuat Supabase Auth user.
