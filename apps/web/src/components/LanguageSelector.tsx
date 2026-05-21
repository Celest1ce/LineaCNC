import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  variant?: 'navbar' | 'auth' | 'profile';
}

export function LanguageSelector({ variant = 'navbar' }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'fr', label: t('language.french'), flag: 'fi-fr' },
    { code: 'en', label: t('language.english'), flag: 'fi-gb' },
    { code: 'de', label: t('language.german'), flag: 'fi-de' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('preferredLanguage', languageCode);
    setIsOpen(false);
  };

  const getButtonStyles = () => {
    switch (variant) {
      case 'auth':
        return 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm';
      case 'profile':
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
      case 'navbar':
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 ${getButtonStyles()}`}
        aria-label={t('language.select')}
      >
        <span className={`fi ${currentLanguage.flag} text-xl`} style={{ display: 'block', lineHeight: 1 }}></span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
          <div className="py-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 transition-colors ${
                  i18n.language === language.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
              >
                <span className={`fi ${language.flag} text-lg flex-shrink-0`} style={{ display: 'block', lineHeight: 1 }}></span>
                <span className="font-medium">{language.label}</span>
                {i18n.language === language.code && (
                  <svg className="w-5 h-5 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
