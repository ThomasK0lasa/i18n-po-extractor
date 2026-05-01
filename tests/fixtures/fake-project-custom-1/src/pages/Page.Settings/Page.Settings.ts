import {t} from '../../i18n';

export class PageSettings extends LitElement {
    render() {
        return html`${t('PAGE.SETTINGS.TITLE')} ${t('PAGE.SETTINGS.SUBTITLE')} ${t('SAVE')}`;
    }
}
