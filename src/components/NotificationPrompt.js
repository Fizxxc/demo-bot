'use client';
import { useEffect, useState } from 'react';

export default function NotificationPrompt({ enabled = true }) {
  const [visible, setVisible] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
    setSupported(ok);
    if (!ok || !enabled) return;
    navigator.serviceWorker.register('/push-notification.js').catch(() => {});
    const dismissed = localStorage.getItem('notif_prompt_dismissed');
    if (!dismissed && Notification.permission === 'default') {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [enabled]);

  async function enable() {
    if (!supported) return;
    const permission = await Notification.requestPermission();
    localStorage.setItem('notif_prompt_dismissed', '1');
    setVisible(false);
    if (permission === 'granted') {
      new Notification('Kograph Market', { body: 'Notifikasi aktif. Kamu akan mendapat info penting dari dashboard.' });
    }
  }

  function close() {
    localStorage.setItem('notif_prompt_dismissed', '1');
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <div className="notif-pop">
      <b>Aktifkan notifikasi?</b>
      <p>Dapatkan info status bot, invoice, chat, dan withdraw lebih cepat.</p>
      <div className="nav-links"><button className="btn primary" onClick={enable}>Aktifkan</button><button className="btn" onClick={close}>Nanti</button></div>
    </div>
  );
}
