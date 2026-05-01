import {it} from 'node:test';
/**
 * Tests for fake-project-react — file namespace pattern.
 * Per-file namespace, central locales output, camelCase keys.
 */
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {runIn, parsePo, getKeys, cleanupProject} from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = join(__dirname, '..', 'fixtures', 'fake-project-react');

export default function () {
    it('creates one .po per source file for flat component structure', () => {
        cleanupProject(projectDir);
        runIn(projectDir);
        if (!existsSync(join(projectDir, 'locales/en/Button.po'))) throw new Error('Button.po not created');
        if (!existsSync(join(projectDir, 'locales/en/Modal.po'))) throw new Error('Modal.po not created');
        if (!existsSync(join(projectDir, 'locales/en/Navbar.po'))) throw new Error('Navbar.po not created');
        if (!existsSync(join(projectDir, 'locales/en/Home.po'))) throw new Error('Home.po not created');
        if (!existsSync(join(projectDir, 'locales/en/About.po'))) throw new Error('About.po not created');
        if (!existsSync(join(projectDir, 'locales/en/Contact.po'))) throw new Error('Contact.po not created');
    });

    it('creates .po files for all locales', () => {
        if (!existsSync(join(projectDir, 'locales/de/Button.po'))) throw new Error('Button.de.po not created');
        if (!existsSync(join(projectDir, 'locales/de/Modal.po'))) throw new Error('Modal.de.po not created');
    });

    it('keys from components and pages are isolated to their file', () => {
        const buttonKeys = getKeys(parsePo(join(projectDir, 'locales/en/Button.po')));
        const modalKeys = getKeys(parsePo(join(projectDir, 'locales/en/Modal.po')));
        if (!buttonKeys.includes('confirm')) throw new Error('confirm not in Button');
        if (buttonKeys.includes('title')) throw new Error('Modal title leaked into Button');
        if (!modalKeys.includes('title')) throw new Error('title not in Modal');
    });

    it('camelCase keys do not trigger validation warning', () => {
        const result = runIn(projectDir);
        const output = result.stdout + result.stderr;
        if (output.includes('KEY FORMAT')) throw new Error('Unexpected format violations for camelCase keys');
    });

    it('X-Namespace header written for each file namespace', () => {
        const data = parsePo(join(projectDir, 'locales/en/Button.po'));
        if (data?.headers?.['X-Namespace'] !== 'Button') {
            throw new Error(`Expected X-Namespace Button, got ${data?.headers?.['X-Namespace']}`);
        }
    });
}
