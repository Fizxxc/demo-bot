import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const tenantId = process.argv[2] || process.env.TENANT_ID;
if (!tenantId) {
  console.error('Isi TENANT_ID atau jalankan: npm run seed -- <tenant-id>');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi.');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const products = [
  {
    code: '1',
    name: 'YOUTUBE 1 BULAN FAMHEAD',
    price: 5000,
    accounts: [
      { username: 'ytuser1@mail.com', password: 'pass123', tipe: '1 Bulan Famhead' },
      { username: 'ytuser2@mail.com', password: 'pass456', tipe: '1 Bulan Famhead' },
      { username: 'ytuser3@mail.com', password: 'pass789', tipe: '1 Bulan Famhead' }
    ]
  },
  { code: '2', name: 'CANVA PRO 12 BULAN', price: 55000, accounts: [] },
  {
    code: '3',
    name: 'CANVA PRO LIFETIME',
    price: 100000,
    accounts: [
      { username: 'canvalife1@mail.com', password: 'life123', tipe: 'Lifetime' },
      { username: 'canvalife2@mail.com', password: 'life456', tipe: 'Lifetime' }
    ]
  },
  {
    code: '4',
    name: 'EXPRESS VPN 30 HARI',
    price: 30000,
    accounts: [
      { username: 'vpnuser1@mail.com', password: 'vpnpass', tipe: '30 Hari' }
    ]
  },
  {
    code: '5',
    name: 'SPOTIFY PREMIUM 1B STUDENT GP',
    price: 25000,
    accounts: [
      { username: 'spotify1@mail.com', password: 'spo123', tipe: '1 Bulan Student' },
      { username: 'spotify2@mail.com', password: 'spo456', tipe: '1 Bulan Student' }
    ]
  }
];

for (const item of products) {
  const { data: product, error } = await db
    .from('products')
    .upsert(
      {
        tenant_id: tenantId,
        code: item.code,
        name: item.name,
        price: item.price,
        is_active: true
      },
      { onConflict: 'tenant_id,code' }
    )
    .select('*')
    .single();

  if (error) throw error;

  if (item.accounts.length) {
    const accounts = item.accounts.map((acc) => ({
      tenant_id: tenantId,
      product_id: product.id,
      username: acc.username,
      password: acc.password,
      tipe: acc.tipe,
      status: 'available'
    }));

    const { error: accountError } = await db.from('product_accounts').insert(accounts);
    if (accountError) throw accountError;
  }

  console.log(`Seeded ${item.code}. ${item.name}`);
}

console.log('Selesai.');
