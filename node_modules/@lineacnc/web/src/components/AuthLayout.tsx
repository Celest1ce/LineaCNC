import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Contenu principal */}
      <main className="flex-grow overflow-hidden">
        {children}
      </main>
    </div>
  );
}
