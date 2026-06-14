import './globals.css';

export const metadata = {
  title: 'Kograph Market Bot Platform',
  description: 'Platform sewa bot Telegram auto order multi-tenant.',
  icons: { icon: '/assets/kograph-logo.png' }
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
