import {useTranslation} from 'react-i18next';

export function Contact() {
    const {t} = useTranslation('Contact');
    return (
        <main>
            <h1>{t('pageTitle')}</h1>
            <label>{t('nameLabel')}</label>
            <label>{t('emailLabel')}</label>
            <label>{t('messageLabel')}</label>
            <button>{t('sendButton')}</button>
        </main>
    );
}
