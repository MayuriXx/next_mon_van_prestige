'use client';

/**
 * components/pages/CgvPage.tsx
 *
 * Dynamic general terms and conditions page ("Conditions Générales de Vente").
 *
 * Business purpose:
 *   Displays the CGV for MS Prestige Driver's VTC service. This is a French
 *   legal and commercial obligation, always displayed in French regardless
 *   of the selected locale.
 *
 * Data strategy:
 *   All article titles and bodies are fetched from Firestore `contenus/cgv`
 *   via the useContenus hook. If a field is empty or missing, the component
 *   falls back to the static default defined below. Mohammed can update any
 *   article from the admin panel (/admin/contenus → CGV section).
 *
 *   Body text supports simple formatting conventions:
 *   - Lines starting with "- " are rendered as gold-bullet list items
 *   - Empty lines create paragraph breaks
 *   - All other lines are rendered as paragraphs
 *
 * Design:
 *   Follows the same visual pattern as FaqPage and MentionsLegalesPage:
 *   background image overlay, hero title, card-based article sections.
 *
 * Content source: `cgv_ms_vprestige_driver_.docx` provided by Mohammed.
 */

import { useContenus } from '@/lib/hooks/useContenus';
import { useTariffs } from '@/lib/hooks/useTariffs';
import styles from './LegalPage.module.css';

// ─── Static fallback values ─────────────────────────────────────────────────
const DEFAULTS: Record<string, string> = {
  intro: `La société MS Prestige Driver, basée à Valenciennes (Hauts-de-France), assure des prestations de transport privé avec chauffeur professionnel dans les principales villes de la région. Les devis, factures et réservations sont centralisées à partir de notre siège administratif à Onnaing, afin d'assurer une meilleure gestion de nos services.`,

  article1_title: 'Article 1 – Prestations et tarifs',
  article1_body: `Les prestations réalisées par MS Prestige Driver sont soumises à la réglementation des véhicules de transport avec chauffeur (VTC), conformément aux articles L.231-1 à L.231-4 et R.231-1 à R.231-9 du Code du tourisme. Elles consistent en la mise à disposition d'un véhicule adapté, obligatoirement accompagnée d'un chauffeur professionnel qualifié.

Compris dans la prestation :
- Le véhicule correspondant à la catégorie réservée par le client
- La rémunération du chauffeur
- L'assurance couvrant les passagers
- Le carburant
- Les kilomètres et le temps prévus lors de la réservation initiale
- Le transport des bagages dans la limite de la capacité du véhicule
- Attente de 60 minutes aux aéroports, 20 minutes pour les gares, hôtels et adresses

Ne sont pas inclus dans la prestation :
- Les frais d'attente supplémentaires au-delà de 20 minutes de retard : {{madBusiness}} €/heure pour la catégorie berline, {{madVan}} €/heure pour la catégorie van (facturés par paliers de 30 minutes)
- Les frais additionnels non prévus dans le devis initial`,

  article2_title: 'Article 2 – Réservation et acompte',
  article2_body: `Toute réservation d'un véhicule avec chauffeur auprès de MS Prestige Driver est obligatoire et doit être effectuée via notre site internet, par SMS, téléphone ou e-mail.

Modalités d'acompte exigées :
- 50 % du montant total pour toute réservation effectuée plus de 7 jours avant la prestation
- 30 % du montant total pour toute réservation effectuée moins de 7 jours avant la prestation
- 100 % du montant total pour toute réservation effectuée moins de 24 heures avant la prestation
- Le solde restant dû est exigible avant le début de la prestation
- Il peut être réglé à l'avance ou à bord du véhicule, avant le départ, par carte bancaire ou espèces

Les réservations se font :
- Via le site internet : msprestigedriver.fr
- Par téléphone : 07 83 69 84 60
- Par messagerie WhatsApp : +33 7 83 69 84 60

La réservation devient effective après réception de la confirmation (e-mail ou SMS) de MS Prestige Driver et règlement de l'acompte.

Le client s'engage à fournir des informations exactes :
- Date et heure de prise en charge
- Adresse de départ et de destination
- Nombre de passagers et de bagages
- Nature de la prestation (transfert simple, aller/retour, mise à disposition, etc.)`,

  article3_title: 'Article 3 – Tarifs et modalités de paiement',
  article3_body: `Les tarifs sont exprimés en euros (€), toutes taxes comprises. TVA applicable : 10 % pour les transferts / 20 % pour les mises à disposition horaires.

Le prix de chaque prestation est payable au comptant en euros, avant le début de la prestation. En cas de réservation de dernière minute par téléphone, le client doit prévoir un moyen de paiement immédiat : carte bancaire (CB), lien sécurisé.

Moyens de paiement acceptés :
- Lien de paiement sécurisé
- Carte bancaire
- Espèces

Toute prestation supplémentaire non prévue initialement sera facturée selon les tarifs affichés sur notre site. À l'issue de la prestation, une facture sera transmise par e-mail au client.

Inclus dans nos tarifs :
- Pas de supplément pour les trajets de nuit (21h–6h)
- Des conditions spécifiques (remises, tarifs corporate, commissions) peuvent être appliquées sur demande et selon le volume de transferts`,

  article4_title: 'Article 4 – Annulation de la réservation',
  article4_body: `En cas d'annulation d'un transfert ou d'une mise à disposition à l'initiative du client, celle-ci doit impérativement être signalée par téléphone, quel qu'en soit le motif.

Concernant l'acompte versé :
- En cas d'annulation plus de 72 heures avant la prestation, l'acompte est restitué à hauteur de 30 % du montant total du service
- En cas d'annulation moins de 72 heures avant la prestation, aucun remboursement ne pourra être effectué
- En cas de no-show (client absent à l'heure et au lieu convenus), aucun remboursement ne sera accordé`,

  article5_title: 'Article 5 – Limitation de responsabilité et sécurité',
  article5_body: `MS Prestige Driver ne peut être tenu responsable des retards, annulations ou impossibilités d'exécution résultant de circonstances indépendantes de sa volonté (embouteillages, routes barrées, grèves, intempéries, incidents techniques, retards ou annulations de train/avion, interventions des forces de l'ordre, etc.). En cas d'inexécution totale ou partielle de la prestation pour ces motifs, aucune indemnisation ne pourra être réclamée par le client.

MS Prestige Driver est assuré en responsabilité civile professionnelle et les passagers sont couverts pendant toute la durée de la course.

Toute dégradation ou dommage causé au véhicule sera facturé au client. Les objets oubliés à bord du véhicule restent sous la seule responsabilité du client.

Le chauffeur se réserve le droit d'interrompre immédiatement la prestation en cas de comportement dangereux, agressif, irrespectueux ou illégal du client ; la course reste alors due dans son intégralité.

Pour des raisons de sécurité, il est strictement interdit de fumer, de consommer de l'alcool ou de transporter des substances illicites ou dangereuses à bord du véhicule.`,

  article6_title: 'Article 6 – Réclamations et juridiction compétente',
  article6_body: `Les présentes conditions générales de vente sont rédigées en langue française et s'appliquent à toute personne physique ou morale faisant appel aux services de MS Prestige Driver. L'acceptation d'un devis ou la validation d'une réservation vaut acceptation sans réserve des présentes CGV.

Toute réclamation relative à une prestation doit être adressée dans un délai maximum de 5 jours ouvrables suivant la fin du service, par courrier recommandé avec accusé de réception, à l'adresse suivante :

MS Prestige Driver
92 rue d'Estreux
59171 Onnaing – France

Passé ce délai, aucune réclamation ne pourra être prise en compte. En cas de litige et à défaut de résolution amiable, les tribunaux du ressort de Valenciennes seront seuls compétents.`,
};

// Article IDs in display order
const ARTICLE_IDS = ['1', '2', '3', '4', '5', '6'];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Renders a body string with simple formatting:
 * - Lines starting with "- " → list items with gold bullets
 * - Empty lines → paragraph breaks
 * - Other lines → paragraphs
 */
function renderBody(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let key = 0;

  function flushList() {
    if (currentList.length > 0) {
      elements.push(
        <ul key={key++} className={styles.list}>
          {currentList.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      currentList.push(trimmed.slice(2));
    } else {
      flushList();
      if (trimmed.length > 0) {
        elements.push(
          <p key={key++} className={styles.text}>{trimmed}</p>
        );
      }
    }
  }
  flushList();

  return elements;
}

// ─── Component ──────────────────────────────────────────────────────────────

import React from 'react';

export default function CgvPage() {
  const { get } = useContenus('cgv');
  const { tariffs } = useTariffs();

  function field(key: string): string {
    const raw = get(key) || DEFAULTS[key] || '';
    // Inject live MAD hourly rates so the CGV waiting-fee clause always matches
    // the grid (and any admin edit), whether the text comes from the default or
    // a Firestore override that keeps the {{madBusiness}}/{{madVan}} tokens.
    return raw
      .replace(/\{\{madBusiness\}\}/g, String(tariffs.mad.BUSINESS))
      .replace(/\{\{madVan\}\}/g, String(tariffs.mad.VAN));
  }

  return (
    <div className={styles.wrapper}>
      {/* ── Background image overlay ── */}
      <div className={styles.bgOverlay} aria-hidden />

      {/* ── Hero title ── */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Conditions Générales de Vente</h1>
        <p className={styles.heroSubtitle}>
          MS Prestige Driver – Service de transport privé avec chauffeur
        </p>
        <div className={styles.separator} aria-hidden />
      </section>

      {/* ── Content ── */}
      <section className={styles.contentSection}>
        {/* Intro paragraph */}
        <div className={styles.card}>
          <p className={styles.text}>{field('intro')}</p>
        </div>

        {/* Articles 1–6 */}
        {ARTICLE_IDS.map((id) => (
          <div key={id} className={styles.card}>
            <h2 className={styles.cardTitle}>
              {field(`article${id}_title`)}
            </h2>
            {renderBody(field(`article${id}_body`))}
          </div>
        ))}
      </section>
    </div>
  );
}
