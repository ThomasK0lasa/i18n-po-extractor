import {t} from './i18n';

export function renderLogin() {
    document.querySelector('main').innerHTML = `
        <h1>${t('login title')}</h1>
        <form>
            <label>${t('email label')}</label>
            <label>${t('password label')}</label>
            <button>${t('login button')}</button>
            <a href="/forgot">${t('forgot password')}</a>
        </form>
    `;
}
