import {html} from 'lit';
import {t} from '../../../i18n';

export function template() {
    // i18n-extract-key NAV.ITEM_HOME
    // i18n-extract-key NAV.ITEM_SETTINGS
    /* i18n-extract-comment Main navigation template */
    const title = t('NAV.TITLE');
    const items = ['HOME', 'SETTINGS'];
    const rendered = items.map((item) => t(`NAV.ITEM_${item}`)); /* i18n-extract-ignore */
    return html`<nav>${title}</nav>`;
}
