// Public-facing contact channel. The support/legal/abuse/security/sales @shopenter.app
// addresses referenced in legal docs, the footer, and landing/pricing pages point at a
// domain that isn't actually owned yet — anyone could register it and receive that mail.
// Shopenter's own LINE Official Account (the intended long-term channel) isn't set up yet
// either. Until one of those exists, every public-facing "how do I contact Shopenter" spot
// uses this single string so there's one place to update instead of hunting down every
// occurrence — swap this in once the LINE OA (or a real mailbox) exists.
export const PUBLIC_CONTACT_TEXT = 'our LINE Official Account (coming soon)';
