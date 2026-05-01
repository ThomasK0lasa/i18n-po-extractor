import {t} from '../../i18n';

export class OptionsTest {
    render() {
        // context — static string
        const save1 = t('SETTINGS.SAVE', {context: 'verb'});
        const save2 = t('SETTINGS.SAVE', {context: 'noun'});

        // plural — count present
        const count = t('SETTINGS.ITEMS_COUNT', {count: this.items.length});

        // interpolation vars
        const welcome = t('SETTINGS.WELCOME', {name: user.name, date: new Date()});

        // context + plural + vars combined
        const formatted = t('SETTINGS.STATUS', {context: 'active', count: n, label: 'x'});

        // variable options — should warn as unresolvable
        const opts = {context: 'verb'};
        const dynamic1 = t('SETTINGS.SAVE', opts);

        // function call as options — also unresolvable
        const dynamic2 = t('SETTINGS.KEY', getOptions());

        // with ignore — suppress unresolvable warning
        const dynamic3 = t('SETTINGS.KEY2', opts); /* i18n-extract-ignore */

        // multiple context markers — produces one entry per context
        /* i18n-extract-context verb */
        /* i18n-extract-context noun */
        /* i18n-extract-key SETTINGS.ACTION */

        // annotations for the variable options case
        /* i18n-extract-context verb */
        /* i18n-extract-is-plural */
        /* i18n-extract-var action */
        const withMarkers = t('SETTINGS.SAVE', opts);

        // inline options context wins over marker context
        /* i18n-extract-context marker_context */
        const optionsWin = t('SETTINGS.OPTIONS_WIN', {context: 'options_context'});

        // marker context + variable options (unresolvable) — marker still applies
        /* i18n-extract-context verb */
        /* i18n-extract-var var1 */
        const markerWithVarOpts = t('SETTINGS.MARKER_VARS', opts);

        // i18n-extract-comment + context marker with description — both in #.
        /* i18n-extract-comment Keep this very short */
        /* i18n-extract-context verb - action verb */
        /* i18n-extract-key SETTINGS.MIXED_COMMENT */

        // explicit annotation key with context — always extracted regardless of nearby t() calls
        /* i18n-extract-context verb */
        /* i18n-extract-key SETTINGS.IGNORE_MARKER */
        const disableWithMarker = t('SETTINGS.IGNORE_MARKER', opts); /* i18n-extract-ignore */

        return `${save1} ${save2} ${count} ${welcome}`;
    }
}
