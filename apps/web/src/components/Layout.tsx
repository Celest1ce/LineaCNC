import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

interface LayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  enableNavbarAutoHide?: boolean;
}

export function Layout({ children, fullWidth = false, enableNavbarAutoHide = false }: LayoutProps) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const { user } = useAuth();
  const { preferences, isNavbarVisible } = useUserPreferences();

  // Calculer le padding-top dynamiquement
  // Si auto-hide est activé et que la navbar est visible, ajouter un padding-top
  // Si auto-hide est désactivé, pas de padding (navbar en sticky)
  const shouldAutoHide = enableNavbarAutoHide && preferences.navbarAutoHide;
  const mainPaddingTop = shouldAutoHide && isNavbarVisible ? 'pt-16' : '';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar enableAutoHide={enableNavbarAutoHide} />
      <main className={`flex-grow ${mainPaddingTop} ${!isHomePage && !fullWidth ? 'container mx-auto px-4 py-8' : ''}`}>
        {children}
      </main>
      {!user && <Footer />}
    </div>
  );
}
