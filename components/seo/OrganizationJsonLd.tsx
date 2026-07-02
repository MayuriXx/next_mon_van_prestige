/**
 * components/seo/OrganizationJsonLd.tsx
 *
 * Injects two combined Schema.org types for MS Prestige Driver:
 *
 * — TaxiService  : tells search engines this is a ride / chauffeur service.
 * — LocalBusiness: provides the physical address, phone, and opening hours
 *                  so Google can populate the Knowledge Panel and Maps.
 *
 * Both types share the same entity via the @type array pattern.
 * This component is rendered inside the locale layout so it appears on
 * every page of the site.
 *
 * Schema.org references:
 *   https://schema.org/TaxiService
 *   https://schema.org/LocalBusiness
 */
import JsonLd from './JsonLd';

const schema = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'TaxiService'],
  name: 'MS Prestige Driver',
  url: 'https://mon-van-prestige.web.app',
  logo: 'https://mon-van-prestige.web.app/ms_prestige_driver_logo_splash.png',
  image: 'https://mon-van-prestige.web.app/og-default.jpg',
  description:
    'Service de transport VTC premium à Valenciennes. Transferts aéroport, mise à disposition, déplacements professionnels et événements spéciaux en véhicule de luxe avec chauffeur privé.',
  telephone: '+33783698460',
  email: 'contact@msprestigedriver.fr',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '92 rue d\'Estreux',
    addressLocality: 'Onnaing',
    postalCode: '59264',
    addressCountry: 'FR',
  },
  geo: {
    // Approximate coordinates for Onnaing (92 rue d'Estreux). Verify the exact point on Google Maps.
    '@type': 'GeoCoordinates',
    latitude: 50.3736,
    longitude: 3.5806,
  },
  areaServed: [
    { '@type': 'City', name: 'Valenciennes' },
    { '@type': 'State', name: 'Hauts-de-France' },
    { '@type': 'Country', name: 'France' },
    { '@type': 'Country', name: 'Belgique' },
  ],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday',
        'Friday', 'Saturday', 'Sunday',
      ],
      opens: '00:00',
      closes: '23:59',
    },
  ],
  priceRange: '€€',
  currenciesAccepted: 'EUR',
  paymentAccepted: 'Cash, Credit Card, Bank Transfer',
  sameAs: [
    'https://www.facebook.com/msprestigedriver',
  ],
};

export default function OrganizationJsonLd() {
  return <JsonLd data={schema} />;
}
