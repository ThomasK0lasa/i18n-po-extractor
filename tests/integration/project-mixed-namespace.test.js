import {it, after} from 'node:test';
/**
 * Tests for fake-project-custom-2 — mixed namespace pattern.
 * Components use folder namespace next to source, lib files use central output.
 */
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {runIn, parsePo, getKeys, cleanupProject, backupPoFiles, restorePoFiles} from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = join(__dirname, '..', 'fixtures', 'fake-project-custom-2');

export default function () {
    const poBackup = backupPoFiles(projectDir, ['src/components', 'src/pages', 'locales']);

    it('runs cleanly with mixed boundaries', () => {
        cleanupProject(projectDir);
        const result = runIn(projectDir);
        if (result.code !== 0) throw new Error(`Expected exit 0, got ${result.code}\n${result.stderr}`);
    });

    it('folder boundary creates .po next to source for components', () => {
        if (!existsSync(join(projectDir, 'src/components/AppHeader/i18n/AppHeader.en.po'))) {
            throw new Error('AppHeader.en.po not created next to source');
        }
        if (!existsSync(join(projectDir, 'src/components/AppFooter/i18n/AppFooter.en.po'))) {
            throw new Error('AppFooter.en.po not created next to source');
        }
    });

    it('folder boundary creates .po next to source for pages', () => {
        if (!existsSync(join(projectDir, 'src/pages/PageHome/i18n/PageHome.en.po'))) {
            throw new Error('PageHome.en.po not created next to source');
        }
        if (!existsSync(join(projectDir, 'src/pages/PageAbout/i18n/PageAbout.en.po'))) {
            throw new Error('PageAbout.en.po not created next to source');
        }
    });

    it('file boundary writes lib files to central locales', () => {
        if (!existsSync(join(projectDir, 'locales/en/email.po'))) throw new Error('email.po not in locales/');
        if (!existsSync(join(projectDir, 'locales/en/password.po'))) throw new Error('password.po not in locales/');
        if (!existsSync(join(projectDir, 'locales/en/date.po'))) throw new Error('date.po not in locales/');
        if (!existsSync(join(projectDir, 'locales/en/currency.po'))) throw new Error('currency.po not in locales/');
    });

    it('component folder keys are isolated to their namespace', () => {
        const headerPo = join(projectDir, 'src/components/AppHeader/i18n/AppHeader.en.po');
        const footerPo = join(projectDir, 'src/components/AppFooter/i18n/AppFooter.en.po');
        const headerKeys = getKeys(parsePo(headerPo));
        const footerKeys = getKeys(parsePo(footerPo));
        if (!headerKeys.includes('appName')) throw new Error('appName not in AppHeader');
        if (!headerKeys.includes('navHome')) throw new Error('navHome not in AppHeader');
        if (!footerKeys.includes('footerCopyright')) throw new Error('footerCopyright not in AppFooter');
        if (footerKeys.includes('appName')) throw new Error('appName leaked into AppFooter');
    });

    it('second run does not make component keys obsolete', () => {
        runIn(projectDir);
        const headerPo = join(projectDir, 'src/components/AppHeader/i18n/AppHeader.en.po');
        const keys = getKeys(parsePo(headerPo));
        if (!keys.includes('appName')) throw new Error('appName became obsolete after second run');
    });

    it('lib file namespace has no X-Namespace header', () => {
        const emailPo = join(projectDir, 'locales/en/email.po');
        const data = parsePo(emailPo);
        if (data?.headers?.['X-Namespace']) throw new Error('X-Namespace should not be in lib file');
    });

    it('component namespaces have X-Namespace header', () => {
        const headerPo = join(projectDir, 'src/components/AppHeader/i18n/AppHeader.en.po');
        const data = parsePo(headerPo);
        if (data?.headers?.['X-Namespace'] !== 'AppHeader') {
            throw new Error(`Expected X-Namespace AppHeader, got ${data?.headers?.['X-Namespace']}`);
        }
    });

    it('camelCase validation warns on lib snake_case keys', () => {
        const result = runIn(projectDir);
        const output = result.stdout + result.stderr;
        if (!output.includes('KEY FORMAT')) throw new Error('Expected camelCase violations for snake_case lib keys');
    });

    it('all locales generated for all namespaces', () => {
        if (!existsSync(join(projectDir, 'src/components/AppHeader/i18n/AppHeader.fr.po'))) {
            throw new Error('AppHeader.fr.po not created');
        }
        if (!existsSync(join(projectDir, 'locales/fr/email.po'))) {
            throw new Error('email.fr.po not created in locales/');
        }
    });

    after(() => {
        cleanupProject(projectDir);
        restorePoFiles(poBackup);
    });
}
