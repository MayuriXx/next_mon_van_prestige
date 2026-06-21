import { redirect } from 'next/navigation';

export const dynamic = 'force-static';

// Nécessaire avec output: export pour générer /index.html
export function generateStaticParams() {
  return [{}];
}

export default function RootPage() {
  // Sur le serveur (statique), on redirige vers /fr
  redirect('/fr');
}
