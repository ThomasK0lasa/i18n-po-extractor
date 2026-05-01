import {it} from 'node:test';
import {join} from 'node:path';
import {projectDir, parsePo, getKeys} from '../helpers.js';

const settingsPo = join(projectDir, 'src/components/Settings/i18n/Settings.en.po');
const pageScanPo = join(projectDir, 'src/pages/Page.Scan/i18n/Page.Scan.en.po');

export default function () {
    it('groups all files in a folder under one namespace', () => {
        const keys = getKeys(parsePo(settingsPo));
        if (!keys.includes('SETTINGS.LANGUAGE')) throw new Error('SETTINGS.LANGUAGE not found');
        if (!keys.includes('SETTINGS.THEME')) throw new Error('SETTINGS.THEME not found');
    });

    it('creates page namespace .po files', () => {
        const keys = getKeys(parsePo(pageScanPo));
        if (!keys.includes('PAGE.SCAN.TITLE')) throw new Error('PAGE.SCAN.TITLE not found');
        if (!keys.includes('PAGE.SCAN.DESCRIPTION')) throw new Error('PAGE.SCAN.DESCRIPTION not found');
    });
}
