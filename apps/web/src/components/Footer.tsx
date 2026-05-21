import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo size="md" />
          </div>
          <p className="text-gray-400 text-sm mb-2">
            &copy; {currentYear} {t('app.title')}. Tous droits réservés.
          </p>
          <p className="text-gray-500 text-xs">
            {t('app.tagline')}
          </p>
          <div className="mt-4 flex justify-center space-x-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">
              À propos
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Contact
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Confidentialité
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
