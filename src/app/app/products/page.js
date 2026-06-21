export const dynamic = 'force-dynamic';
import { requireUser } from '../../../lib/auth.js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';
import { formatRupiah } from '../../../lib/money.js';
import MascotCard from '../../../components/MascotCard.js';

export default async function ProductsPage() {
  const user = await requireUser();
  const { data: products } = user.tenant_id ? await supabaseAdmin().from('product_stock').select('*').eq('tenant_id', user.tenant_id).order('code') : { data: [] };
  return (
    <>
      <div className="topbar"><div><p className="eyebrow">Catalog Manager</p><h2>Produk</h2><p>Produk bisa diisi via web atau lewat bot owner Telegram. Data masuk ke tabel Supabase yang sama.</p></div></div>
      {!user.tenant_id && <div className="notice">Sambungkan bot dulu di Bot Setting sebelum membuat produk.</div>}
      <div className="grid two">
        <div className="card"><h3>Tambah Produk</h3><form className="form" method="post" action="/api/web/products/create"><input className="input" name="code" placeholder="Kode produk, contoh YT1" required/><input className="input" name="name" placeholder="Nama produk" required/><input className="input" name="price" placeholder="Harga" required/><textarea className="textarea" name="description" placeholder="Deskripsi"/><button className="btn primary" type="submit">Tambah Produk</button></form></div>
        <MascotCard
          image="/assets/mascots/products-run-box.webp"
          title="Pose lari untuk flow produk."
          text="Halaman katalog memakai maskot pembawa box agar terasa cocok dengan aktivitas tambah produk dan stock." 
          badge="Products Mascot"
          compact
        />
        <div className="card"><h3>Tambah Stock</h3><form className="form" method="post" action="/api/web/products/add-stock"><select className="select" name="productId" required><option value="">Pilih produk</option>{(products || []).map((p) => <option key={p.id} value={p.id}>{p.code}. {p.name}</option>)}</select><textarea className="textarea" name="accounts" placeholder={'username | password | tipe | catatan\nakun2@mail.com | pass | 1 Bulan | Garansi'} required/><button className="btn" type="submit">Tambah Stock</button></form></div>
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <h3>Daftar Produk</h3>
        <table className="table"><thead><tr><th>Kode</th><th>Nama</th><th>Harga</th><th>Stok</th><th>Status</th></tr></thead><tbody>
          {(products || []).map((p) => <tr key={p.id}><td>{p.code}</td><td>{p.name}</td><td>{formatRupiah(p.price)}</td><td>{p.stock}</td><td>{p.is_active ? 'Aktif' : 'Nonaktif'}</td></tr>)}
        </tbody></table>
      </div>
    </>
  );
}
