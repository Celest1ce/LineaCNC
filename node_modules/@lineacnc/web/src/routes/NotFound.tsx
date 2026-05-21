import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { Button } from '../components/UI/Button';

export function NotFound() {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="text-center py-20">
        <h1 className="text-9xl font-bold text-primary-600">404</h1>
        <h2 className="text-4xl font-bold mt-4 mb-4">{t('errors.404')}</h2>
        <p className="text-xl text-gray-600 mb-8">
          {t('errors.404Description')}
        </p>
        <Link to="/">
          <Button variant="primary">{t('errors.backHome')}</Button>
        </Link>
      </div>
    </Layout>
  );
}
