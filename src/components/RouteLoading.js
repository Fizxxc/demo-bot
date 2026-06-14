'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function RouteLoading() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  useEffect(() => {
    const show = (event) => {
      const link = event.target?.closest?.('a');
      if (link && link.href && link.origin === location.origin && !link.href.includes('#')) setLoading(true);
    };
    const submit = () => setLoading(true);
    document.addEventListener('click', show);
    document.addEventListener('submit', submit);
    return () => {
      document.removeEventListener('click', show);
      document.removeEventListener('submit', submit);
    };
  }, []);

  if (!loading) return null;
  return <div className="loading-screen"><div className="loading-glow" /><div className="loading-card">Memuat...</div></div>;
}
