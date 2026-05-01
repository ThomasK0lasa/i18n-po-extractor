import {useTranslation} from 'react-i18next';

export function Home() {
    const {t} = useTranslation('Home');
    return (
        <main>
            <h1>{t('heroTitle')}</h1>
            <p>{t('heroSubtitle')}</p>
            <button>{t('getStarted')}</button>
            <button>{t('learnMore')}</button>
        </main>
    );
}
