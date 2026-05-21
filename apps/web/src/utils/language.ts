/**
 * Détecte la langue préférée du navigateur parmi les langues supportées
 * @returns Le code de langue (fr, en, de) ou 'fr' par défaut
 */
export function detectBrowserLanguage(): string {
  const supportedLanguages = ['fr', 'en', 'de'];

  // Essayer d'obtenir la langue du navigateur
  const browserLanguage = navigator.language || (navigator as any).userLanguage;

  if (!browserLanguage) {
    return 'fr'; // Langue par défaut
  }

  // Extraire le code de langue (ex: 'en-US' -> 'en')
  const languageCode = browserLanguage.split('-')[0].toLowerCase();

  // Vérifier si la langue est supportée
  if (supportedLanguages.includes(languageCode)) {
    return languageCode;
  }

  // Langue par défaut si non supportée
  return 'fr';
}

/**
 * Mappe les codes de langue vers leur nom complet
 */
export const languageNames: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  de: 'Deutsch'
};

/**
 * Mappe les codes de langue vers leur emoji de drapeau
 */
export const languageFlags: Record<string, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  de: '🇩🇪'
};
