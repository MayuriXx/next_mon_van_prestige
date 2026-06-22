import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MS Prestige Driver — VTC de luxe à Valenciennes',
  description:
    'Service de transport VTC premium à Valenciennes. Transferts aéroport, déplacements professionnels, événements spéciaux.',
};

// Le layout [locale] fournit <html lang={locale}> et <body>.
// Ce root layout ne doit pas les dupliquer.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
