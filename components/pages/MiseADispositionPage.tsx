'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLocaleFromPath, localePath } from '@/lib/utils/locale';
import styles from './MiseADispositionPage.module.css';

const FEATURES = [
  {
    id: 'chauffeur',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      </svg>
    ),
    title_fr: 'Chauffeur dédié',
    title_en: 'Dedicated chauffeur',
    title_nl: 'Toegewijde chauffeur',
    desc_fr: 'Votre chauffeur reste à votre entière disposition pendant toute la durée réservée.',
    desc_en: 'Your chauffeur remains fully at your disposal for the entire reserved duration.',
    desc_nl: 'Uw chauffeur blijft volledig tot uw beschikking gedurende de gehele gereserveerde duur.',
  },
  {
    id: 'flexibilite',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title_fr: 'Flexibilité totale',
    title_en: 'Total flexibility',
    title_nl: 'Totale flexibiliteit',
    desc_fr: 'Changez d\'itinéraire à tout moment. Vous êtes libre de vos déplacements.',
    desc_en: 'Change your itinerary at any time. You are free to go wherever you need.',
    desc_nl: 'Verander uw route op elk moment. U bent vrij om te gaan waar u wilt.',
  },
  {
    id: 'attente',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
      </svg>
    ),
    title_fr: 'Attente incluse',
    title_en: 'Waiting time included',
    title_nl: 'Wachttijd inbegrepen',
    desc_fr: 'Votre chauffeur vous attend pendant vos rendez-vous ou vos courses sans frais supplémentaires.',
    desc_en: 'Your chauffeur waits for you during your appointments or errands at no extra cost.',
    desc_nl: 'Uw chauffeur wacht op u tijdens uw afspraken of boodschappen zonder extra kosten.',
  },
  {
    id: 'extension',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" /><path d="M5 12l7 7 7-7" />
      </svg>
    ),
    title_fr: 'Extension possible',
    title_en: 'Extendable service',
    title_nl: 'Verlengbaar',
    desc_fr: 'Besoin de plus de temps ? Prolongez votre mise à disposition sur demande.',
    desc_en: 'Need more time? Extend your chauffeur service on request.',
    desc_nl: 'Meer tijd nodig? Verleng uw chauffeursdienst op aanvraag.',
  },
];

const DURATIONS_FR = ['2 heures', '3 heures', '4 heures', '5 heures', '6 heures', '8 heures', '10 heures', '12 heures'];
const DURATIONS_EN = ['2 hours', '3 hours', '4 hours', '5 hours', '6 hours', '8 hours', '10 hours', '12 hours'];
const DURATIONS_NL = ['2 uur', '3 uur', '4 uur', '5 uur', '6 uur', '8 uur', '10 uur', '12 uur'];

const PASSENGERS_FR = ['1 Passager', '2 Passagers', '3 Passagers', '4 Passagers', '5 Passagers', '6 Passagers', '7 Passagers', '8 Passagers'];
const PASSENGERS_EN = ['1 Passenger', '2 Passengers', '3 Passengers', '4 Passengers', '5 Passengers', '6 Passengers', '7 Passengers', '8 Passengers'];
const PASSENGERS_NL = ['1 Passagier', '2 Passagiers', '3 Passagiers', '4 Passagiers', '5 Passagiers', '6 Passagiers', '7 Passagiers', '8 Passagiers'];

type Locale = 'fr' | 'en' | 'nl';

const CONTENT = {
  fr: {
    tag: 'MISE À DISPOSITION',
    title: 'Un chauffeur à votre disposition',
    subtitle: 'Profitez d\'un service de chauffeur privé pendant la durée de votre choix. Idéal pour vos rendez-vous d\'affaires, shopping, visites ou événements.',
    note: '* Durée minimum de mise à disposition : 2 heures (20km par heure inclus)',
    badges: ['Flexibilité totale', 'Chauffeur dédié', 'Sécurité'],
    formTitle: 'Réservez votre mise à disposition',
    datePlaceholder: 'jj/mm/aaaa',
    timePlaceholder: 'Sélectionner l\'heure',
    pickupPlaceholder: 'Adresse de prise en charge',
    dropoffPlaceholder: 'Adresse de destination',
    durationLabel: 'Durée de la mise à disposition',
    passengersLabel: 'Nombre de passagers',
    ctaBtn: 'VOIR LES VÉHICULES',
    sectionTitle: 'Service Mise à Disposition',
    durations: DURATIONS_FR,
    passengers: PASSENGERS_FR,
  },
  en: {
    tag: 'CHAUFFEUR SERVICE',
    title: 'A chauffeur at your service',
    subtitle: 'Enjoy a private chauffeur service for the duration of your choice. Perfect for business meetings, shopping, visits or events.',
    note: '* Minimum duration: 2 hours (20 km per hour included)',
    badges: ['Total flexibility', 'Dedicated chauffeur', 'Safety'],
    formTitle: 'Book your chauffeur service',
    datePlaceholder: 'dd/mm/yyyy',
    timePlaceholder: 'Select time',
    pickupPlaceholder: 'Pickup address',
    dropoffPlaceholder: 'Destination address',
    durationLabel: 'Service duration',
    passengersLabel: 'Number of passengers',
    ctaBtn: 'SEE VEHICLES',
    sectionTitle: 'Chauffeur Service',
    durations: DURATIONS_EN,
    passengers: PASSENGERS_EN,
  },
  nl: {
    tag: 'CHAUFFEUR TER BESCHIKKING',
    title: 'Een chauffeur tot uw beschikking',
    subtitle: 'Geniet van een privéchauffeursdienst naar keuze. Ideaal voor zakelijke afspraken, winkelen, bezoeken of evenementen.',
    note: '* Minimale duur: 2 uur (20 km per uur inbegrepen)',
    badges: ['Totale flexibiliteit', 'Toegewijde chauffeur', 'Veiligheid'],
    formTitle: 'Boek uw chauffeursdienst',
    datePlaceholder: 'dd/mm/jjjj',
    timePlaceholder: 'Tijd selecteren',
    pickupPlaceholder: 'Ophaaladres',
    dropoffPlaceholder: 'Bestemmingsadres',
    durationLabel: 'Duur van de dienst',
    passengersLabel: 'Aantal passagiers',
    ctaBtn: 'VOERTUIGEN BEKIJKEN',
    sectionTitle: 'Chauffeur ter Beschikking',
    durations: DURATIONS_NL,
    passengers: PASSENGERS_NL,
  },
};

const BADGE_ICONS = [
  // Clock
  <svg key="clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>,
  // User
  <svg key="user" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>,
  // Shield
  <svg key="shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>,
];

export default function MiseADispositionPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as Locale;
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
            <h1 className={styles.heroTitle}>{c.title}</h1>
            <p className={styles.heroSubtitle}>{c.subtitle}</p>
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

          {/* Droite : formulaire */}
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>{c.formTitle}</h2>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Date</label>
                <div className={styles.inputWithIcon}>
                  <input type="date" className={styles.formInput} />
                  <span className={styles.inputIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Heure</label>
                <div className={styles.inputWithIcon}>
                  <input type="time" className={styles.formInput} />
                  <span className={styles.inputIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <input type="text" className={styles.formInput} placeholder={c.pickupPlaceholder} />
            </div>

            <div className={styles.formGroup}>
              <input type="text" className={styles.formInput} placeholder={c.dropoffPlaceholder} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{c.durationLabel}</label>
              <select className={styles.formSelect}>
                {c.durations.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{c.passengersLabel}</label>
              <select className={styles.formSelect}>
                {c.passengers.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <Link href={localePath('/reservation', locale)} className={styles.formBtn}>
              {c.ctaBtn}
            </Link>
          </div>
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
