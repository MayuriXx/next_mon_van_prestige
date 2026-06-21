import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MS Prestige Driver — VTC de luxe à Valenciennes',
  description:
    'Service de transport VTC premium à Valenciennes. Transferts aéroport, déplacements professionnels, événements spéciaux.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // suppressHydrationWarning est nécessaire car le layout [locale]
  // définit lang={locale} côté client, ce qui diffère du rendu serveur.
  return (
    <html suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
