/**
 * components/seo/FaqJsonLd.tsx
 *
 * Injects a Schema.org FAQPage structured data block for the /faq route.
 * Google uses this to display FAQ rich results directly in the SERP
 * (expandable question/answer pairs beneath the organic listing).
 *
 * The questions here mirror the static fallback FAQ keys defined in
 * messages/fr.json so that there is always structured data even before
 * Mohammed seeds Firestore content.
 *
 * If Firestore FAQ content diverges significantly from these questions,
 * this component should be updated to match — or made dynamic by fetching
 * Firestore on the server (requires ISR or SSR, not compatible with
 * output: 'export').
 *
 * Schema.org reference: https://schema.org/FAQPage
 */
import JsonLd from './JsonLd';

const faqItems = [
  {
    question: 'Comment réserver ?',
    answer:
      'Vous pouvez réserver via notre formulaire en ligne, par téléphone ou par WhatsApp. Une confirmation vous sera envoyée par email dès validation de votre demande.',
  },
  {
    question: 'Quels moyens de paiement acceptez-vous ?',
    answer:
      'Nous acceptons les paiements par carte bancaire (Visa, Mastercard), virement bancaire et espèces. Toutes les transactions en ligne sont sécurisées.',
  },
  {
    question: 'Où pouvons-nous vous rencontrer ?',
    answer:
      "Nous opérons depuis Valenciennes et ses alentours. Nos chauffeurs vous récupèrent à l'adresse de votre choix : domicile, hôtel, gare, aéroport ou tout autre lieu en Hauts-de-France.",
  },
  {
    question: 'Acceptez-vous les animaux dans vos véhicules ?',
    answer:
      'Oui, nous acceptons les animaux de compagnie sous certaines conditions (animal dans une cage de transport adaptée ou tenu en laisse). Merci de nous informer lors de la réservation.',
  },
  {
    question: 'Peut-on louer vos véhicules sans chauffeur ?',
    answer:
      'Non, nos véhicules sont exclusivement disponibles avec chauffeur professionnel. Nous ne proposons pas de location sans conducteur.',
  },
  {
    question: 'Est-il possible de mettre un chauffeur à disposition quelques heures ?',
    answer:
      'Oui, notre service Mise à Disposition vous permet de bénéficier d'un chauffeur dédié à la journée ou au demi-journée, selon vos besoins.',
  },
  {
    question: 'Disposez-vous de sièges enfants ?',
    answer:
      'Oui, nous mettons des sièges enfants adaptés à disposition (bébé, enfant, rehausseur) sur simple demande lors de la réservation, sans supplément.',
  },
  {
    question: 'Vos services sont-ils dédiés aux particuliers et aux professionnels ?',
    answer:
      'Oui, nous travaillons aussi bien avec les particuliers qu'avec les entreprises. Nous proposons une facturation adaptée aux professionnels avec TVA et un suivi de compte dédié.',
  },
  {
    question: 'Que se passe-t-il si mon avion ou mon train a du retard ?',
    answer:
      'Pas de souci ! Nous suivons en temps réel l'état de votre vol ou de votre train. Votre chauffeur s'adapte automatiquement à l'heure réelle d'arrivée, sans frais supplémentaires.',
  },
  {
    question: 'Comment puis-je régler ma facture ?',
    answer:
      'Votre facture est émise automatiquement après chaque course. Elle vous est envoyée par email. Vous pouvez la régler en ligne par carte, par virement ou en espèces auprès de votre chauffeur.',
  },
];

const schema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export default function FaqJsonLd() {
  return <JsonLd data={schema} />;
}
