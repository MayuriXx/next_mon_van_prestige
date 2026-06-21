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
  // Le layout [locale] fournit ses propres <html> et <body>.
  // Ce wrapper est obligatoire pour Next.js App Router mais ne doit pas
  // dupliquer les balises : on retourne directement les enfants.
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
