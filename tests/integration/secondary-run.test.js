import {it} from 'node:test';
import {join} from 'node:path';
import {writeFileSync} from 'node:fs';
import {projectDir, run, parsePo, compilePo, getKeys, getObsolete} from '../helpers.js';

const navbarPo = join(projectDir, 'src/components/NavBar/i18n/NavBar.en.po');
const commonPo = join(projectDir, 'src/i18n/common.en.po');

export default function () {
    it('source references are updated on second run', () => {
        run();
        const data = parsePo(navbarPo);
        const ref = data?.translations?.['']?.['NAV.SETTINGS']?.comments?.reference;
        if (!ref) throw new Error('Reference lost after second run');
        if (!ref.includes('NavBar')) throw new Error('Reference does not point to NavBar');
    });

    it('source-extracted translator comment survives second run', () => {
        run();
        const data = parsePo(navbarPo);
        const comment = data?.translations?.['']?.['NAV.SETTINGS_HINT']?.comments?.extracted;
        if (!comment) throw new Error('Source-extracted translator comment lost on second run');
        if (!comment.includes('settings tooltip')) throw new Error(`Wrong comment: ${comment}`);
    });

    it('manually written translator comment survives multiple runs', () => {
        const data = parsePo(navbarPo);
        data.translations['']['NAV.SETTINGS'].comments = {
            ...data.translations['']['NAV.SETTINGS'].comments,
            extracted: 'Keep this short — fits in top bar',
        };
        writeFileSync(navbarPo, compilePo(data));
        run();
        run();
        const updated = parsePo(navbarPo);
        const comment = updated?.translations?.['']?.['NAV.SETTINGS']?.comments?.extracted;
        if (comment !== 'Keep this short — fits in top bar') {
            throw new Error(`Translator comment lost after multiple runs, got: ${comment}`);
        }
    });

    it('obsolete keys persist across multiple runs', () => {
        const data = parsePo(navbarPo);
        data.translations['']['NAV.REMOVED_KEY'] = {msgid: 'NAV.REMOVED_KEY', msgstr: ['Removed']};
        writeFileSync(navbarPo, compilePo(data));
        run();
        run();
        run();
        const updated = parsePo(navbarPo);
        if (!getObsolete(updated).includes('NAV.REMOVED_KEY')) throw new Error('Obsolete key lost after multiple runs');
    });

    it('common key referenced in multiple files has all refs in #:', () => {
        // CANCEL is used in NavBar.ts and Settings.ts
        const data = parsePo(commonPo);
        const entry = data?.translations?.['']?.['CANCEL'];
        if (!entry) throw new Error('CANCEL not found in common');
        if (!entry.comments?.reference) throw new Error('No source reference for CANCEL');
        const refs = entry.comments.reference.split('\n');
        if (refs.length < 2) throw new Error(`Expected multiple refs for CANCEL, got: ${entry.comments.reference}`);
    });
}
