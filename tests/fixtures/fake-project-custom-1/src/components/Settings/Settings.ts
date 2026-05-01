import {t} from '../../i18n';

export class Settings extends LitElement {
    render() {
        const tabs = ['appearance', 'language'];
        // dynamic key — for testing forbidDynamic
        const tabLabel = (tab) => t(`SETTINGS.TAB_${tab}`);
        return html`${t('SETTINGS.TITLE')} ${t('SETTINGS.SAVE')} ${t('CANCEL')}`;
    }
}
