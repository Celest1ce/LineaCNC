import React from 'react';

interface LogoProps {
  variant?: 'default' | 'white' | 'icon';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onDark?: boolean; // true si sur fond sombre, false si sur fond clair
}

export function Logo({ variant = 'default', className = '', size = 'md', onDark = true }: LogoProps) {
  const [hasCustomLogo, setHasCustomLogo] = React.useState(false);
  const [logoSrc, setLogoSrc] = React.useState('');

  React.useEffect(() => {
    const loadLogo = async () => {
      try {
        let logoModule;

        if (variant === 'white') {
          logoModule = await import('../assets/logos/logo-white.svg?url').catch(() => null);
        } else if (variant === 'icon') {
          logoModule = await import('../assets/logos/logo-icon.svg?url').catch(() => null);
        } else {
          logoModule = await import('../assets/logos/logo.svg?url').catch(() => null);
        }

        if (logoModule && logoModule.default) {
          setLogoSrc(logoModule.default);
          setHasCustomLogo(true);
        }
      } catch (error) {
        setHasCustomLogo(false);
      }
    };

    loadLogo();
  }, [variant]);

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const imgSizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
  };

  if (hasCustomLogo && logoSrc) {
    return (
      <img
        src={logoSrc}
        alt="LineaCNC Logo"
        className={`${imgSizeClasses[size]} w-auto ${className}`}
      />
    );
  }

  // Logo par défaut (texte) - Adapté au fond
  return (
    <span className={`${sizeClasses[size]} font-bold flex items-center space-x-2 ${className}`}>
      <span className={onDark ? "text-white" : "text-gray-900"}>Linea</span>
      <span className={onDark ? "text-sky-300" : "text-sky-600"}>CNC</span>
    </span>
  );
}
