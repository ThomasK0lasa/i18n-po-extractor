import {it} from 'node:test';
import {join} from 'node:path';
import {writeFileSync} from 'node:fs';
import {projectDir, run, parsePo, compilePo, getKeys, getObsolete} from '../helpers.js';

const navbarPo = join(projectDir, 'src/components/NavBar/i18n/NavBar.en.po');

export default function () {
    it('preserves existing translations on second run', () => {
        const data = parsePo(navbarPo);
        data.translations['']['NAV.SETTINGS'].msgstr = ['Ustawienia'];
        writeFileSync(navbarPo, compilePo(data));
        run();
        const updated = parsePo(navbarPo);
        const msgstr = updated?.translations?.['']?.['NAV.SETTINGS']?.msgstr?.[0];
        if (msgstr !== 'Ustawienia') throw new Error(`Translation lost, got: ${msgstr}`);
    });

    it('moves removed keys to obsolete (#~)', () => {
        const data = parsePo(navbarPo);
        data.translations['']['NAV.OLD_KEY'] = {msgid: 'NAV.OLD_KEY', msgstr: ['Old']};
        writeFileSync(navbarPo, compilePo(data));
        run();
        const updated = parsePo(navbarPo);
        if (!getObsolete(updated).includes('NAV.OLD_KEY')) throw new Error('NAV.OLD_KEY not moved to obsolete');
        if (getKeys(updated).includes('NAV.OLD_KEY')) throw new Error('NAV.OLD_KEY still in active translations');
    });

    it('preserves obsolete keys across subsequent runs', () => {
        const data = parsePo(navbarPo);
        if (!getObsolete(data).includes('NAV.OLD_KEY')) throw new Error('NAV.OLD_KEY not preserved in obsolete');
    });

    it('preserves translator comments (#.) across runs', () => {
        const data = parsePo(navbarPo);
        data.translations['']['NAV.SETTINGS'].comments = {
            ...data.translations['']['NAV.SETTINGS'].comments,
            extracted: 'Appears in the top navigation bar',
        };
        writeFileSync(navbarPo, compilePo(data));
        run();
        const updated = parsePo(navbarPo);
        const comment = updated?.translations?.['']?.['NAV.SETTINGS']?.comments?.extracted;
        if (comment !== 'Appears in the top navigation bar') throw new Error(`Translator comment lost, got: ${comment}`);
    });
}
