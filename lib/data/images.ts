/**
 * lib/data/images.ts
 *
 * Static fallback image data used when Firestore is unavailable.
 * All paths point to existing files under public/images/.
 *
 * Firestore (via lib/firebase/images.ts) takes precedence at runtime;
 * this file is only used as a last-resort fallback.
 */
export const imagesData = {
  hero: {
    url: '/images/hero/chauffeur-prive.jpg',
    alt: 'Chauffeur privé MS Prestige Driver',
  },
  vehicles: {
    business: {
      url: '/images/vehicles/business.jpg',
      alt: 'Berline Business',
      position: 1,
    },
    van: {
      url: '/images/vehicles/van.jpg',
      alt: 'Van Premium',
      position: 2,
    },
  },
  sections: {
    'transfert-aeroport': {
      url: '/images/sections/transfert-aeroport.jpg',
      alt: 'Transfert Aéroport',
    },
    'transfert-simple': {
      url: '/images/sections/transfert-simple.jpg',
      alt: 'Transfert Simple',
    },
    'mise-a-disposition': {
      url: '/images/sections/mise-a-disposition.jpg',
      alt: 'Mise à Disposition',
    },
    'evenements-speciaux': {
      url: '/images/sections/evenements-speciaux.jpg',
      alt: 'Événements Spéciaux',
    },
    'escapades-loisirs': {
      url: '/images/sections/escapades-loisirs.jpg',
      alt: 'Escapades & Loisirs',
    },
    'deplacements-professionnels': {
      url: '/images/sections/deplacements-professionnels.jpg',
      alt: 'Déplacements Professionnels',
    },
    'transport-feminin': {
      url: '/images/sections/transport-feminin.webp',
      alt: 'Transport au Féminin',
    },
  },
};
