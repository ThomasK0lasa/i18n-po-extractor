import {it} from 'node:test';
/**
 * Tests for fake-project-simple-spa — single namespace pattern.
 * All files route to one translation file, no namespace separation.
 */
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync, writeFileSync} from 'node:fs';
import {runIn, parsePo, compilePo, getKeys, getObsolete, cleanupProject} from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = join(__dirname, '..', 'fixtures', 'fake-project-simple-spa');
const enPo = join(projectDir, 'public/i18n/translation.en.po');
const frPo = join(projectDir, 'public/i18n/translation.fr.po');

export default function () {
    it('creates single translation file for all src files', () => {
        cleanupProject(projectDir);
        runIn(projectDir);
        if (!existsSync(enPo)) throw new Error('translation.en.po not created');
        if (!existsSync(frPo)) throw new Error('translation.fr.po not created');
    });

    it('keys from all source files appear in single output', () => {
        const keys = getKeys(parsePo(enPo));
        // from header.ts
        if (!keys.includes('nav home')) throw new Error('nav home not found');
        // from login.ts
        if (!keys.includes('login title')) throw new Error('login title not found');
        // from dashboard.ts
        if (!keys.includes('welcome back')) throw new Error('welcome back not found');
    });

    it('no X-Namespace header when writeNamespaceHeader is false', () => {
        const data = parsePo(enPo);
        if (data?.headers?.['X-Namespace']) throw new Error('X-Namespace should not be present');
    });

    it('second run does not make keys from any file obsolete', () => {
        runIn(projectDir);
        const keys = getKeys(parsePo(enPo));
        if (!keys.includes('nav home')) throw new Error('nav home became obsolete');
        if (!keys.includes('login title')) throw new Error('login title became obsolete');
    });

    it('translations preserved across runs', () => {
        const data = parsePo(enPo);
        data.translations['']['login title'].msgstr = ['Se connecter'];
        writeFileSync(enPo, compilePo(data));
        runIn(projectDir);
        const updated = parsePo(enPo);
        const msgstr = updated?.translations?.['']?.['login title']?.msgstr?.[0];
        if (msgstr !== 'Se connecter') throw new Error(`Translation lost, got: ${msgstr}`);
    });

    it('source references span multiple files', () => {
        const data = parsePo(enPo);
        const allRefs = Object.values(data?.translations?.[''] ?? {})
            .filter((e) => e.msgid)
            .map((e) => e.comments?.reference ?? '')
            .join('\n');
        if (!allRefs.includes('header')) throw new Error('No reference to header.ts');
        if (!allRefs.includes('login')) throw new Error('No reference to login.ts');
        if (!allRefs.includes('dashboard')) throw new Error('No reference to dashboard.ts');
    });
}
