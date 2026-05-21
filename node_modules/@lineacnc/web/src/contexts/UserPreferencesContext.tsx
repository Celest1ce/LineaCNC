import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserPreferences {
  navbarAutoHide: boolean;
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  setNavbarAutoHide: (enabled: boolean) => void;
  isNavbarVisible: boolean;
  setIsNavbarVisible: (visible: boolean) => void;
}

const defaultPreferences: UserPreferences = {
  navbarAutoHide: false,
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

const STORAGE_KEY = 'lineatools_user_preferences';

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    // Charger les préférences depuis localStorage au montage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
    return defaultPreferences;
  });

  const [isNavbarVisible, setIsNavbarVisible] = useState(true);

  // Sauvegarder les préférences dans localStorage quand elles changent
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }, [preferences]);

  const setNavbarAutoHide = (enabled: boolean) => {
    setPreferences(prev => ({ ...prev, navbarAutoHide: enabled }));
  };

  return (
    <UserPreferencesContext.Provider value={{ preferences, setNavbarAutoHide, isNavbarVisible, setIsNavbarVisible }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};
