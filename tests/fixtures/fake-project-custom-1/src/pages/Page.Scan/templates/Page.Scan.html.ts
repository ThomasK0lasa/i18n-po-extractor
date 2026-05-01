import {html} from 'lit';
import {t} from '../../../i18n';

export function template() {
    return html`
        <h1>${t('PAGE.SCAN.TITLE')}</h1>
        <p>${t('PAGE.SCAN.DESCRIPTION')}</p>
        <button>${t('PAGE.SCAN.START')}</button>
        <button>${t('PAGE.SCAN.STOP')}</button>
    `;
}
