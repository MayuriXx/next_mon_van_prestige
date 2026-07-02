'use client';

import styles from './FloatingButtons.module.css';

/**
 * Client contact details (SAHLI Mohamed — MS Prestige Driver / Mon Van Prestige).
 * Source: legal mentions ("Mentions légales") provided by the client.
 * NOTE: phone and WhatsApp share the same number for this sole trader (EI).
 *       If the WhatsApp line ever differs from the call line, split WHATSAPP out.
 */
const PHONE = '+33783698460';
const WHATSAPP = '+33783698460';
const EMAIL = 'contact@msprestigedriver.fr';

export default function FloatingButtons() {
  // wa.me expects the international number WITHOUT the leading "+".
  // No pre-filled message: the button just opens a blank WhatsApp chat.
  const waNumber = WHATSAPP.replace(/\D/g, '');
  const waHref = `https://wa.me/${waNumber}`;

  return (
    <div className={styles.wrapper} aria-label="Contacts rapides">
      {/* US1 — Phone button: triggers a real phone call via the tel: scheme. */}
      <a
        href={`tel:${PHONE}`}
        className={`${styles.btn} ${styles.phone}`}
        aria-label="Appeler MS Prestige Driver"
        title="Appeler"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden>
          <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.26.2 2.47.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z" />
        </svg>
      </a>

      {/* US2 — WhatsApp button: official WhatsApp glyph, opens a blank chat via wa.me. */}
      <a
        href={waHref}
        className={`${styles.btn} ${styles.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contacter par WhatsApp"
        title="WhatsApp"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </a>

      {/* US3 — Email button: opens the user's mail client via the mailto: scheme. */}
      <a
        href={`mailto:${EMAIL}`}
        className={`${styles.btn} ${styles.email}`}
        aria-label="Envoyer un email"
        title="Email"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden>
          <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
      </a>
    </div>
  );
}
