/**
 * Seed data pour Firestore
 * Structure pour Issue #8 - Homepage
 * 
 * Utilisation:
 * 1. Téléchargez les images vers Firebase Storage
 * 2. Mettez à jour les URLs dans les documents ci-dessous
 * 3. Exécutez ce seed dans la Firebase Console ou via script
 */

// ============================================================
// IMAGES
// ============================================================

// Collection: images
// Doc: hero
{
  url: "https://firebasestorage.googleapis.com/v0/b/mon-van-prestige.appspot.com/o/images%2Fhero%2Faeroport.jpg?alt=media",
  alt: "Aéroport - Transfer Premium"
}

// Collection: images > vehicles > all
// Docs: business, van, van2
{
  name: "business",
  url: "https://firebasestorage.googleapis.com/...",
  alt: "Berline Business",
  position: 1
},
{
  name: "van",
  url: "https://firebasestorage.googleapis.com/...",
  alt: "Van Premium",
  position: 2
}

// Collection: images > sections
// Docs: transfert-aeroport, transfert-simple, mise-a-disposition, etc.
{
  // Pour transfert-aeroport
  url: "https://firebasestorage.googleapis.com/...",
  alt: "Transfert Aéroport"
},
{
  // Pour transfert-simple
  url: "https://firebasestorage.googleapis.com/...",
  alt: "Transfert Simple"
},
// ... etc pour les 6 services

// ============================================================
// CONTENU
// ============================================================

// Collection: contenu > services > list
// Docs: confiabilite, assurance, vip, confort, flotte, impeccable
{
  name: "Confiabilité",
  description: "Service fiable et professionnel",
  icon: "✓",
  slug: "confiabilite",
  position: 1
},
{
  name: "Assurance Premium",
  description: "Couverture complète garantie",
  icon: "🛡️",
  slug: "assurance",
  position: 2
},
{
  name: "VIP Professionnels",
  description: "Services haut de gamme",
  icon: "👔",
  slug: "vip",
  position: 3
},
{
  name: "Confort",
  description: "Véhicules climatisés",
  icon: "❄️",
  slug: "confort",
  position: 4
},
{
  name: "Flotte Moderne",
  description: "Dernières technologies",
  icon: "🚗",
  slug: "flotte",
  position: 5
},
{
  name: "Impeccable",
  description: "Entretien rigoureux",
  icon: "✨",
  slug: "impeccable",
  position: 6
}

// Collection: contenu > vehicles > list
// Docs: business, van
{
  name: "Berline Business",
  description: "Pour vos trajets élégants et professionnels",
  features: ["Capacité: 4 passagers", "Confortable", "Premium"],
  position: 1
},
{
  name: "Van Premium",
  description: "Pour les groupes et les grands trajets",
  features: ["Grande Capacité: 6-8", "Groupes", "Bagage XXL"],
  position: 2
}

// Collection: contenu > sections
// Docs: transfert-aeroport, transfert-simple, mise-a-disposition, etc.
{
  // Pour transfert-aeroport
  title: "Transfert Aéroport Sécurisé",
  description: "Accédez aux aéroports parisiens et belges en toute sérénité. Nos chauffeurs connaissent parfaitement les itinéraires pour vous arriver à l'heure, sans stress.",
  imagePosition: "left"
},
{
  // Pour transfert-simple
  title: "Transfert Simple & Rapide",
  description: "Pour vos trajets ponctuels, une solution simple, confortable et fiable. Réservez en quelques clics et profitez d'un service premium.",
  imagePosition: "right"
},
{
  // Pour mise-a-disposition
  title: "Mise à Disposition",
  description: "Besoin d'un chauffeur à l'heure? Nos forfaits flexibles s'adaptent à vos besoins pour une journée ou plus.",
  imagePosition: "left"
},
{
  // Pour evenements-speciaux
  title: "Événements Spéciaux",
  description: "Mariages, galas, soirées... Nous assurons le transport de vos invités avec élégance et discrétion.",
  imagePosition: "right"
},
{
  // Pour escapades-loisirs
  title: "Escapades & Loisirs",
  description: "Découvrez de nouvelles destinations en toute tranquillité. Nos packages tout inclus pour vos sorties en groupe.",
  imagePosition: "left"
},
{
  // Pour deplacements-professionnels
  title: "Déplacements Professionnels",
  description: "Pour vos clients importants et réunions d'affaires. Service discret, professionnel et ponctuel.",
  imagePosition: "right"
}

// ============================================================
// TARIFS
// ============================================================

// Collection: tarifs > aeroports > destinations
// Docs: cdg, orly, zaventem, charleroi, lesquin, gares
{
  // CDG
  name: "Paris CDG",
  business: "300-390€",
  van: "390-550€"
},
{
  // ORLY
  name: "Paris ORLY",
  business: "360-450€",
  van: "420-590€"
},
{
  // ZAVENTEM
  name: "Bruxelles Zaventem",
  business: "190-230€",
  van: "235-320€"
},
{
  // CHARLEROI
  name: "Charleroi",
  business: "145-180€",
  van: "180-240€"
},
{
  // LESQUIN
  name: "Lesquin",
  business: "90-130€",
  van: "130-170€"
},
{
  // GARES
  name: "Gares",
  business: "90-140€",
  van: "140-180€"
}

// Collection: tarifs > destinations > speciales
// Docs: asterix, walibi, disney, lens, losc
{
  // ASTERIX
  name: "Parc Asterix",
  business: "275-350€",
  van: "360-450€"
},
{
  // WALIBI
  name: "Parc Walibi",
  business: "140-200€",
  van: "240-270€"
},
{
  // DISNEY
  name: "Disneyland",
  business: "340-450€",
  van: "399-590€"
},
{
  // LENS
  name: "Lens",
  business: "110-140€",
  van: "150-180€"
},
{
  // LOSC
  name: "Stade LOSC",
  business: "90-140€",
  van: "130-155€"
}

// Collection: tarifs > hourly > rates
// Doc: mad
{
  name: "Mise à Disposition (MAD)",
  business: "55€/h",
  van: "90€/h"
}

// ============================================================
// CONFIGURATION ADMINS
// ============================================================
// Collection: config
// Doc: contact
{
  phone: "+33327...",
  whatsapp: "https://wa.me/33327...",
  email: "contact@msvprestige.fr",
  address: "Valenciennes, France"
}
