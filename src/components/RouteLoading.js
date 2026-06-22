'use client';
import { useEffect, useState } from 'react';

export default function RouteLoading() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = 'kograph_initial_loading_done';
    if (sessionStorage.getItem(key)) return;
    setLoading(true);
    const timer = setTimeout(() => {
      sessionStorage.setItem(key, '1');
      setLoading(false);
    }, 850);
    return () => clearTimeout(timer);
  }, []);

  if (!loading) return null;
  return <div className="loading-screen"><div className="loading-glow" /><div className="loading-card">Memuat Kograph...</div></div>;
}
