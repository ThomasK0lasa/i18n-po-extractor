import {it} from 'node:test';
import {join} from 'node:path';
import {projectDir, parsePo} from '../helpers.js';

const navbarPo = join(projectDir, 'src/components/NavBar/i18n/NavBar.en.po');

export default function () {
    it('writes source references (#:) to .po files', () => {
        const data = parsePo(navbarPo);
        const entry = data?.translations?.['']?.['NAV.SETTINGS'];
        if (!entry?.comments?.reference) throw new Error('No source reference found');
        if (!entry.comments.reference.includes('NavBar')) throw new Error('Reference does not point to NavBar file');
    });

    it('key used in multiple files has multiple refs', () => {
        // SETTINGS.TITLE appears in both Settings.ts and Settings.html.ts
        const settingsPo = join(projectDir, 'src/components/Settings/i18n/Settings.en.po');
        const data = parsePo(settingsPo);
        const entry = data?.translations?.['']?.['SETTINGS.TITLE'];
        if (!entry?.comments?.reference) throw new Error('No reference for SETTINGS.TITLE');
        const refs = entry.comments.reference.split('\n');
        if (refs.length < 2) throw new Error(`Expected multiple refs, got: ${entry.comments.reference}`);
    });
}
