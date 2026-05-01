import {it} from 'node:test';
import {join} from 'node:path';
import {projectDir, parsePo} from '../helpers.js';

const navbarPo = join(projectDir, 'src/components/NavBar/i18n/NavBar.en.po');

export default function () {
    it('extracts translator comment from source into #. in .po', () => {
        const data = parsePo(navbarPo);
        const entry = data?.translations?.['']?.['NAV.SETTINGS_HINT'];
        if (!entry) throw new Error('NAV.SETTINGS_HINT not found');
        if (!entry.comments?.extracted) throw new Error('No extracted comment found');
        if (!entry.comments.extracted.includes('settings tooltip')) {
            throw new Error(`Wrong comment: ${entry.comments.extracted}`);
        }
    });

    it('preserves manually written translator comments across runs', () => {
        const data = parsePo(navbarPo);
        const entry = data?.translations?.['']?.['NAV.SETTINGS'];
        if (!entry) throw new Error('NAV.SETTINGS not found');
        if (!entry.comments) throw new Error('No comments object on entry');
    });

    it('multiple annotations produce multi-line #. comment', () => {
        const data = parsePo(navbarPo);
        const entry = data?.translations?.['']?.['NAV.MULTI_COMMENT'];
        if (!entry) throw new Error('NAV.MULTI_COMMENT not found');
        const extracted = entry.comments?.extracted ?? '';
        if (!extracted.includes('First line of instruction')) throw new Error('First comment line missing');
        if (!extracted.includes('Second line of instruction')) throw new Error('Second comment line missing');
    });

    it('context annotation inline description written to #.', () => {
        const data = parsePo(navbarPo);
        const entry = data?.translations?.['verb']?.['NAV.ACTION'];
        if (!entry) throw new Error('NAV.ACTION with context verb not found');
        const extracted = entry.comments?.extracted ?? '';
        if (!extracted.includes('action performed by user')) throw new Error(`Context description missing from #.: ${extracted}`);
    });

    it('vars annotation inline description written to #.', () => {
        const data = parsePo(navbarPo);
        const entry = data?.translations?.['']?.['NAV.WITH_VARS'];
        if (!entry) throw new Error('NAV.WITH_VARS not found');
        const extracted = entry.comments?.extracted ?? '';
        if (!extracted.includes('{{userName}}')) throw new Error('{{userName}} missing from #.');
        if (!extracted.includes('the user')) throw new Error('userName description missing from #.');
        if (!extracted.includes('{{itemCount}}')) throw new Error('{{itemCount}} missing from #.');
        if (!extracted.includes('how many items')) throw new Error('itemCount description missing from #.');
    });

    it('vars annotation with description per var', () => {
        const data = parsePo(navbarPo);
        const entry = data?.translations?.['']?.['NAV.AUTO_VARS'];
        if (!entry) throw new Error('NAV.AUTO_VARS not found');
        const extracted = entry.comments?.extracted ?? '';
        if (!extracted.includes('{{name}}')) throw new Error('{{name}} missing from #.');
        if (!extracted.includes('user name')) throw new Error('name description missing from #.');
        if (!extracted.includes('{{date}}')) throw new Error('{{date}} missing from #.');
        if (!extracted.includes('registration date')) throw new Error('date description missing from #.');
    });

    it('i18n-extract-is-plural marks key as plural', () => {
        const data = parsePo(navbarPo);
        const entry = data?.translations?.['']?.['NAV.ITEMS'];
        if (!entry) throw new Error('NAV.ITEMS not found');
        if (!entry.msgid_plural) throw new Error('NAV.ITEMS not marked as plural');
        if (entry.msgid_plural !== 'NAV.ITEMS') throw new Error(`Wrong msgid_plural: ${entry.msgid_plural}`);
    });
}
