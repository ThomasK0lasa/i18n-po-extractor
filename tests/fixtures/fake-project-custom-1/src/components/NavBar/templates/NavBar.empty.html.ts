import {html} from 'lit';
import {t} from '../../../i18n';

export function renderEmpty() {
    return html`<p>${t('NAV.EMPTY')}</p>`;
}
