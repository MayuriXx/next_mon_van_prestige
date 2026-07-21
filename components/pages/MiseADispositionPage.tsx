'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { getLocaleFromPath } from '@/lib/utils/locale';
import { useContenus } from '@/lib/hooks/useContenus';
import ReservationForm from '@/components/reservation/ReservationForm';
import styles from './MiseADispositionPage.module.css';

/* ── Features data ── */
const FEATURES = [
  {
    id: 'chauffeur',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      </svg>
    ),
    title_fr: 'Chauffeur dédié',        title_en: 'Dedicated chauffeur',         title_nl: 'Toegewijde chauffeur',
    desc_fr: 'Votre chauffeur reste à votre entière disposition pendant toute la durée réservée.',
    desc_en: 'Your chauffeur remains fully at your disposal for the entire reserved duration.',
    desc_nl: 'Uw chauffeur blijft volledig tot uw beschikking gedurende de gehele gereserveerde duur.',
  },
  {
    id: 'flexibilite',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    title_fr: 'Flexibilité totale',      title_en: 'Total flexibility',           title_nl: 'Totale flexibiliteit',
    desc_fr: "Changez d'itinéraire à tout moment. Vous êtes libre de vos déplacements.",
    desc_en: 'Change your itinerary at any time. You are free to go wherever you need.',
    desc_nl: 'Verander uw route op elk moment. U bent vrij om te gaan waar u wilt.',
  },
  {
    id: 'attente',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
      </svg>
    ),
    title_fr: 'Attente incluse',         title_en: 'Waiting time included',       title_nl: 'Wachttijd inbegrepen',
    desc_fr: 'Votre chauffeur vous attend pendant vos rendez-vous ou vos courses sans frais supplémentaires.',
    desc_en: 'Your chauffeur waits for you during your appointments or errands at no extra cost.',
    desc_nl: 'Uw chauffeur wacht op u tijdens uw afspraken of boodschappen zonder extra kosten.',
  },
  {
    id: 'extension',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14"/><path d="M5 12l7 7 7-7"/>
      </svg>
    ),
    title_fr: 'Extension possible',      title_en: 'Extendable service',          title_nl: 'Verlengbaar',
    desc_fr: 'Besoin de plus de temps ? Prolongez votre mise à disposition sur demande.',
    desc_en: 'Need more time? Extend your chauffeur service on request.',
    desc_nl: 'Meer tijd nodig? Verleng uw chauffeursdienst op aanvraag.',
  },
];

type Locale = 'fr' | 'en' | 'nl';

const CONTENT: Record<Locale, {
  tag: string; title: string; subtitle: string; note: string; badges: string[];
  formTitle: string; sectionTitle: string;
}> = {
  fr: {
    tag: 'MISE À DISPOSITION',
    title: 'Un chauffeur à votre disposition',
    subtitle: "Profitez d'un service de chauffeur privé pendant la durée de votre choix. Idéal pour vos rendez-vous d'affaires, shopping, visites ou événements.",
    note: '* Durée minimum de mise à disposition : 2 heures (20km par heure inclus)',
    badges: ['Flexibilité totale', 'Chauffeur dédié', 'Sécurité'],
    formTitle: 'Réservez votre mise à disposition',
    sectionTitle: 'Service Mise à Disposition',
  },
  en: {
    tag: 'CHAUFFEUR SERVICE',
    title: 'A chauffeur at your service',
    subtitle: 'Enjoy a private chauffeur service for the duration of your choice. Perfect for business meetings, shopping, visits or events.',
    note: '* Minimum duration: 2 hours (20 km per hour included)',
    badges: ['Total flexibility', 'Dedicated chauffeur', 'Safety'],
    formTitle: 'Book your chauffeur service',
    sectionTitle: 'Chauffeur Service',
  },
  nl: {
    tag: 'CHAUFFEUR TER BESCHIKKING',
    title: 'Een chauffeur tot uw beschikking',
    subtitle: 'Geniet van een privéchauffeursdienst naar keuze. Ideaal voor zakelijke afspraken, winkelen, bezoeken of evenementen.',
    note: '* Minimale duur: 2 uur (20 km per uur inbegrepen)',
    badges: ['Totale flexibiliteit', 'Toegewijde chauffeur', 'Veiligheid'],
    formTitle: 'Boek uw chauffeursdienst',
    sectionTitle: 'Chauffeur ter Beschikking',
  },
};

const BADGE_ICONS = [
  <svg key="clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>,
  <svg key="user" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>,
  <svg key="shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>,
];

/* ── Page ── */
export default function MiseADispositionPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as Locale;
  const contenus = useContenus('miseADisposition', locale);
  const c = CONTENT[locale] ?? CONTENT.fr;

  function getFeatureTitle(f: typeof FEATURES[0]): string {
    if (locale === 'en') return f.title_en;
    if (locale === 'nl') return f.title_nl;
    return f.title_fr;
  }
  function getFeatureDesc(f: typeof FEATURES[0]): string {
    if (locale === 'en') return f.desc_en;
    if (locale === 'nl') return f.desc_nl;
    return f.desc_fr;
  }

  return (
    <>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroImageWrapper}>
          <Image
            src="/images/sections/mise-a-disposition.jpg"
            alt="Mise à Disposition MS Prestige Driver"
            fill
            className={styles.heroImage}
            priority
          />
        </div>
        <div className={styles.heroOverlay} />
        <div className={styles.heroGradient} />

        <div className={styles.heroContent}>
          {/* Gauche : texte */}
          <div className={styles.heroLeft}>
            <p className={styles.heroTag}>{c.tag}</p>
            <h1 className={styles.heroTitle}>{contenus.get('title') || c.title}</h1>
            <p className={styles.heroSubtitle}>{contenus.get('subtitle') || c.subtitle}</p>
            <p className={styles.heroNote}>{c.note}</p>
            <div className={styles.badges}>
              {c.badges.map((badge, i) => (
                <span key={badge} className={styles.badge}>
                  <span className={styles.badgeIcon}>{BADGE_ICONS[i]}</span>
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Droite : formulaire partagé, verrouillé sur "Mise à Disposition"
              (pas de sélecteur ici — la page implique déjà le service). Le bouton
              "Réserver" mène au funnel véhicules → pop-up → paiement Stripe. */}
          <ReservationForm lockedService="mad" title={c.formTitle} />
        </div>
      </section>

      {/* ── Section Features ── */}
      <section className={styles.features}>
        <div className="container">
          <h2 className={styles.sectionTitle}>{c.sectionTitle}</h2>
          <div className={styles.sectionSeparator} />

          <div className={styles.featuresGrid}>
            {FEATURES.map((feature) => (
              <div key={feature.id} className={styles.featureItem}>
                <div className={styles.featureIconWrap}>
                  {feature.icon}
                </div>
                <div className={styles.featureText}>
                  <h3 className={styles.featureTitle}>{getFeatureTitle(feature)}</h3>
                  <p className={styles.featureDesc}>{getFeatureDesc(feature)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
