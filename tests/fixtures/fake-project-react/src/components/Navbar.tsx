import {useTranslation} from 'react-i18next';

export function Navbar() {
    const {t} = useTranslation('Navbar');
    return (
        <nav>
            <a href="/">{t('home')}</a>
            <a href="/about">{t('about')}</a>
            <a href="/contact">{t('contact')}</a>
            <button>{t('logout')}</button>
        </nav>
    );
}
