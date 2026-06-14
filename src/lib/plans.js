export const PLANS = {
  basic: {
    code: 'basic',
    name: 'Basic',
    price: 10000,
    badge: 'Coba dulu',
    monthlyWithdrawLimit: 500000,
    tone: 'Tidak direkomendasikan untuk jualan serius',
    benefits: [
      'Untuk coba sistem saja',
      '1 bot Telegram',
      'Maksimal 10 produk aktif',
      'Withdraw limit Rp500.000/bulan',
      'Support standar'
    ]
  },
  plus: {
    code: 'plus',
    name: 'Plus',
    price: 35000,
    badge: 'Paling masuk akal',
    monthlyWithdrawLimit: 1000000,
    tone: 'Fitur lengkap untuk mulai jualan',
    benefits: [
      '1 bot Telegram full fitur',
      'Produk dan stok fleksibel',
      'Broadcast user',
      'SATSKO security guard',
      'Live chat + AI fallback',
      'Withdraw limit Rp1.000.000/bulan'
    ]
  },
  promax: {
    code: 'promax',
    name: 'Promax',
    price: 75000,
    badge: 'Paling serius',
    monthlyWithdrawLimit: 3000000,
    tone: 'Fitur prioritas untuk merchant besar',
    benefits: [
      'Semua fitur Plus',
      'Terminal log lebih detail',
      'Prioritas review e-wallet/withdraw',
      'Prompt SATSKO lebih panjang',
      'Ruang pengembangan DOKU/custom gateway',
      'Withdraw limit Rp3.000.000/bulan'
    ]
  }
};

export function getPlan(code) {
  return PLANS[code] || null;
}

export function listPlans() {
  return Object.values(PLANS);
}
