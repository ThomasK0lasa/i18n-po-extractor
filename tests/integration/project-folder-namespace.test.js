import {it} from 'node:test';
/**
 * Tests for fake-project-custom-1 — folder namespace pattern.
 * Per-folder namespace, keys next to source, SCREAMING_SNAKE_CASE.
 */
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {runIn, parsePo, getKeys} from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = join(__dirname, '..', 'fixtures', 'fake-project-custom-1');

export default function () {
    it('each child folder gets its own .po file', () => {
        runIn(projectDir);
        const navbarPo = join(projectDir, 'src/components/NavBar/i18n/NavBar.en.po');
        const settingsPo = join(projectDir, 'src/components/Settings/i18n/Settings.en.po');
        if (!existsSync(navbarPo)) throw new Error('NavBar.en.po not created');
        if (!existsSync(settingsPo)) throw new Error('Settings.en.po not created');
    });

    it('files in templates/ subfolder contribute to parent namespace', () => {
        const navbarPo = join(projectDir, 'src/components/NavBar/i18n/NavBar.en.po');
        const keys = getKeys(parsePo(navbarPo));
        if (!keys.includes('NAV.EMPTY')) throw new Error('NAV.EMPTY from NavBar.empty.html.ts not found');
        if (!keys.includes('NAV.TITLE')) throw new Error('NAV.TITLE from templates not found');
    });

    it('page with dot in folder name uses full folder name as namespace', () => {
        const scanPo = join(projectDir, 'src/pages/Page.Scan/i18n/Page.Scan.en.po');
        const data = parsePo(scanPo);
        if (data?.headers?.['X-Namespace'] !== 'Page.Scan') {
            throw new Error(`Expected X-Namespace Page.Scan, got ${data?.headers?.['X-Namespace']}`);
        }
    });

    it('common keys from both components and pages go to shared common file', () => {
        const commonPo = join(projectDir, 'src/i18n/common.en.po');
        const keys = getKeys(parsePo(commonPo));
        // CANCEL from NavBar.ts, SAVE from Page.Settings.ts
        if (!keys.includes('CANCEL')) throw new Error('CANCEL not in common');
        if (!keys.includes('SAVE')) throw new Error('SAVE not in common');
    });

    it('annotation keys extracted from templates', () => {
        const navbarPo = join(projectDir, 'src/components/NavBar/i18n/NavBar.en.po');
        const keys = getKeys(parsePo(navbarPo));
        if (!keys.includes('NAV.ITEM_HOME')) throw new Error('NAV.ITEM_HOME not found');
        if (!keys.includes('NAV.ITEM_SETTINGS')) throw new Error('NAV.ITEM_SETTINGS not found');
    });

    it('ignore suppresses specific dynamic warning but not others', () => {
        const result = runIn(projectDir);
        const output = result.stdout + result.stderr;
        // Settings.ts has an unguarded dynamic key — warning should appear
        if (!output.includes('DYNAMIC KEYS')) throw new Error('Expected dynamic key warning from Settings.ts');
        // NavBar.html.ts line has ignore — its specific line should not appear
        if (output.includes('NavBar.html.ts:10')) throw new Error('Disabled dynamic key line still in warning');
    });

    it('source-extracted translator comment written to .po', () => {
        const navbarPo = join(projectDir, 'src/components/NavBar/i18n/NavBar.en.po');
        const data = parsePo(navbarPo);
        const entry = data?.translations?.['']?.['NAV.TITLE'];
        if (!entry?.comments?.extracted) throw new Error('Translator comment not extracted for NAV.TITLE');
        if (!entry.comments.extracted.includes('Main navigation')) {
            throw new Error(`Wrong translator comment: ${entry.comments.extracted}`);
        }
    });
}
