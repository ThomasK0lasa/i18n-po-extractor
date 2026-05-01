import {t} from '../../i18n';

export const template = `
    <header>
        <span>{{ t('appName') }}</span>
        <nav>
            <a>{{ t('navHome') }}</a>
            <a>{{ t('navAbout') }}</a>
        </nav>
        <button>{{ t('openMenu') }}</button>
    </header>
`;

export const labels = {
    appName: t('appName'),
    navHome: t('navHome'),
    navAbout: t('navAbout'),
    openMenu: t('openMenu'),
};
