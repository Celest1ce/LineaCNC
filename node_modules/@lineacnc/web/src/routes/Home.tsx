import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { Button } from '../components/UI/Button';
import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

export function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Intersection Observer pour les animations au scroll
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="hero-gradient text-white min-h-[90vh] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-sky-300 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 animate-fade-in-down">
            {t('home.welcome')}
          </h1>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto opacity-90 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {t('home.description')}
          </p>
          <div className="animate-scale-in" style={{ animationDelay: '0.4s' }}>
            <Link to={user ? "/dashboard" : "/login"}>
              <Button variant="primary" className="btn-glass text-lg px-8 py-4">
                {t('home.access')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute inset-x-0 bottom-10 flex justify-center animate-bounce">
          <svg className="w-6 h-6 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="section bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-gradient scroll-reveal">
            {t('home.features.title')}
          </h2>
          <p className="text-center text-gray-600 mb-16 text-lg scroll-reveal">
            {t('home.features.subtitle')}
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="feature-card scroll-reveal" style={{ animationDelay: '0.1s' }}>
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">{t('home.features.realtime.title')}</h3>
              <p className="text-gray-600">
                {t('home.features.realtime.description')}
              </p>
            </div>

            <div className="feature-card scroll-reveal" style={{ animationDelay: '0.2s' }}>
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">{t('home.features.monitoring.title')}</h3>
              <p className="text-gray-600">
                {t('home.features.monitoring.description')}
              </p>
            </div>

            <div className="feature-card scroll-reveal" style={{ animationDelay: '0.3s' }}>
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">{t('home.features.queue.title')}</h3>
              <p className="text-gray-600">
                {t('home.features.queue.description')}
              </p>
            </div>

            <div className="feature-card scroll-reveal" style={{ animationDelay: '0.4s' }}>
              <div className="text-5xl mb-4">🔧</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">{t('home.features.config.title')}</h3>
              <p className="text-gray-600">
                {t('home.features.config.description')}
              </p>
            </div>

            <div className="feature-card scroll-reveal" style={{ animationDelay: '0.5s' }}>
              <div className="text-5xl mb-4">🌐</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">{t('home.features.web.title')}</h3>
              <p className="text-gray-600">
                {t('home.features.web.description')}
              </p>
            </div>

            <div className="feature-card scroll-reveal" style={{ animationDelay: '0.6s' }}>
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">{t('home.features.secure.title')}</h3>
              <p className="text-gray-600">
                {t('home.features.secure.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="section">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="scroll-reveal">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gradient">
                  {t('home.about.title')}
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  {t('home.about.description1')}
                </p>
                <p className="text-lg text-gray-600">
                  {t('home.about.description2')}
                </p>
              </div>

              <div className="scroll-reveal">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-blue-400 rounded-2xl blur-2xl opacity-30"></div>
                  <div className="relative bg-white rounded-2xl p-8 shadow-2xl">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-sky-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                          1
                        </div>
                        <p className="text-gray-700 font-medium">{t('home.about.step1')}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-sky-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                          2
                        </div>
                        <p className="text-gray-700 font-medium">{t('home.about.step2')}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-sky-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                          3
                        </div>
                        <p className="text-gray-700 font-medium">{t('home.about.step3')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section-alt">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            <div className="scroll-reveal">
              <div className="text-5xl font-bold text-gradient mb-2">100%</div>
              <p className="text-gray-600 text-lg">{t('home.stats.webBased')}</p>
            </div>
            <div className="scroll-reveal" style={{ animationDelay: '0.1s' }}>
              <div className="text-5xl font-bold text-gradient mb-2">24/7</div>
              <p className="text-gray-600 text-lg">{t('home.stats.monitoring')}</p>
            </div>
            <div className="scroll-reveal" style={{ animationDelay: '0.2s' }}>
              <div className="text-5xl font-bold text-gradient mb-2">∞</div>
              <p className="text-gray-600 text-lg">{t('home.stats.possibilities')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 scroll-reveal">
            {t('home.cta.title')}
          </h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto opacity-90 scroll-reveal">
            {t('home.cta.subtitle')}
          </p>
          <div className="scroll-reveal">
            <Link to={user ? "/dashboard" : "/login"}>
              <Button variant="primary" className="btn-glass text-lg px-8 py-4">
                {t('home.access')}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
