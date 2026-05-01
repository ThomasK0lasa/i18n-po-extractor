import {t} from './i18n';

export function renderHeader() {
    document.querySelector('header').innerHTML = `
        <nav>
            <a href="/">${t('nav home')}</a>
            <a href="/login">${t('nav login')}</a>
            <a href="/about">${t('nav about')}</a>
        </nav>
    `;
}
