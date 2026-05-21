import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { Button } from '../components/UI/Button';

export function ServerError() {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="text-center py-20">
        <h1 className="text-9xl font-bold text-red-600">500</h1>
        <h2 className="text-4xl font-bold mt-4 mb-4">{t('errors.500')}</h2>
        <p className="text-xl text-gray-600 mb-8">
          {t('errors.500Description')}
        </p>
        <Link to="/">
          <Button variant="primary">{t('errors.backHome')}</Button>
        </Link>
      </div>
    </Layout>
  );
}
