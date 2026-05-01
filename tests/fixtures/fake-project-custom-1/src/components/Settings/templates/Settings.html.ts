import {html} from 'lit';
import {t} from '../../../i18n';

export function template() {
    return html`
        <h1>${t('SETTINGS.TITLE')}</h1>
        <label>${t('SETTINGS.LANGUAGE')}</label>
        <label>${t('SETTINGS.THEME')}</label>
        <button>${t('SETTINGS.SAVE')}</button>
        <button>${t('SETTINGS.RESET')}</button>
    `;
}
