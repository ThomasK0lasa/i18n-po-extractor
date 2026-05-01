import {t} from './i18n';

export function renderDashboard(user) {
    document.querySelector('main').innerHTML = `
        <h1>${t('welcome back')} ${user.name}</h1>
        <p>${t('last login')}: ${user.lastLogin}</p>
        <button>${t('view profile')}</button>
        <button>${t('sign out')}</button>
    `;
}
