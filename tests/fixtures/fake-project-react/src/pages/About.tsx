import {useTranslation} from 'react-i18next';

export function About() {
    const {t} = useTranslation('About');
    return (
        <main>
            <h1>{t('pageTitle')}</h1>
            <p>{t('description')}</p>
        </main>
    );
}
