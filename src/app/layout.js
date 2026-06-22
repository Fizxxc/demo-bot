import { Suspense } from 'react';
import './globals.css';
import ToastFromQuery from '../components/ToastFromQuery.js';
import RouteLoading from '../components/RouteLoading.js';
import NotificationPrompt from '../components/NotificationPrompt.js';
import HelpWidget from '../components/HelpWidget.js';
import { getCurrentUser } from '../lib/auth.js';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Kograph Market Bot Platform',
  description: 'Platform sewa bot Telegram auto order multi-tenant.',
  icons: { icon: '/assets/kograph-logo.png' }
};

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();
  return (
    <html lang="id">
      <body>
        <RouteLoading />
        <Suspense fallback={null}><ToastFromQuery /></Suspense>
        <NotificationPrompt enabled={Boolean(user) && user.notifications_enabled !== false} />
        <HelpWidget enabled={Boolean(user) && user.role === 'merchant' && Boolean(user.plan_code)} />
        {children}
      </body>
    </html>
  );
}
