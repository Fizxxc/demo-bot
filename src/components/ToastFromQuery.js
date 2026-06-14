'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ToastFromQuery() {
  const search = useSearchParams();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const success = search.get('success');
    const error = search.get('error');
    if (success) setToast({ type: 'success', message: success.replaceAll('_', ' ') });
    if (error) setToast({ type: 'error', message: error.replaceAll('_', ' ') });
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [search]);

  if (!toast) return null;
  return <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '⚠️'} {toast.message}</div>;
}
