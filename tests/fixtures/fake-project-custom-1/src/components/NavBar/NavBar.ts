import {t} from '../../i18n';

export class NavBar extends LitElement {
    render() {
        const settings = t('NAV.SETTINGS');
        const about = t('NAV.ABOUT');
        /* i18n-extract-comment Shown in the settings tooltip */
        const hint = t('NAV.SETTINGS_HINT');

        // multiple annotations — multi-line #.
        /* i18n-extract-comment First line of instruction */
        /* i18n-extract-comment Second line of instruction */
        const multi = t('NAV.MULTI_COMMENT');

        // context marker with inline description
        /* i18n-extract-context verb - action performed by user */
        /* i18n-extract-key NAV.ACTION */

        // vars marker with inline description
        /* i18n-extract-var userName - the user */
        /* i18n-extract-var itemCount - how many items */
        const varsHint = t('NAV.WITH_VARS', {userName: 'x', itemCount: 1});

        // description-only vars marker — auto-detects vars from options, adds descriptions
        /* i18n-extract-var name - user name */
        /* i18n-extract-var date - registration date */
        const descOnly = t('NAV.AUTO_VARS', {name: user.name, date: today});

        // plural marker with inline description
        /* i18n-extract-is-plural */
        const plural = t('NAV.ITEMS', {count: n});

        return html`${settings} ${about} ${hint} ${t('CANCEL')}`;
    }
}
