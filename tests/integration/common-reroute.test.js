import {it} from 'node:test';
import {join} from 'node:path';
import {fakeProjectsDir, parsePo, getKeys, runWithConfig, cleanupProject} from '../helpers.js';

const reactDir = join(fakeProjectsDir, 'fake-project-react');
const custom1Dir = join(fakeProjectsDir, 'fake-project-custom-1');

export default function () {

    // rerouting behavior — namespaceInKey: false, commonOutput configured
    it('shared key routes to common po', () => {
        runWithConfig(reactDir, 'i18n-po-extractor-common.json');
        const keys = getKeys(parsePo(join(reactDir, 'locales/en/common.po')));
        if (!keys.includes('pageTitle')) throw new Error('pageTitle not in common.po');
        cleanupProject(reactDir);
    });

    it('shared key is removed from source file po files', () => {
        runWithConfig(reactDir, 'i18n-po-extractor-common.json');
        const aboutKeys = getKeys(parsePo(join(reactDir, 'locales/en/About.po')));
        const contactKeys = getKeys(parsePo(join(reactDir, 'locales/en/Contact.po')));
        if (aboutKeys.includes('pageTitle')) throw new Error('pageTitle still in About.po');
        if (contactKeys.includes('pageTitle')) throw new Error('pageTitle still in Contact.po');
        cleanupProject(reactDir);
    });

    it('non-shared keys remain in their source file po', () => {
        runWithConfig(reactDir, 'i18n-po-extractor-common.json');
        const aboutKeys = getKeys(parsePo(join(reactDir, 'locales/en/About.po')));
        const contactKeys = getKeys(parsePo(join(reactDir, 'locales/en/Contact.po')));
        if (!aboutKeys.includes('description')) throw new Error('description missing from About.po');
        if (!contactKeys.includes('sendButton')) throw new Error('sendButton missing from Contact.po');
        cleanupProject(reactDir);
    });

    it('common po is generated for all locales', () => {
        runWithConfig(reactDir, 'i18n-po-extractor-common.json');
        const enKeys = getKeys(parsePo(join(reactDir, 'locales/en/common.po')));
        const deKeys = getKeys(parsePo(join(reactDir, 'locales/de/common.po')));
        if (!enKeys.includes('pageTitle')) throw new Error('pageTitle missing from en common');
        if (!deKeys.includes('pageTitle')) throw new Error('pageTitle missing from de common');
        cleanupProject(reactDir);
    });

    it('keys unique to a file are not affected by rerouting', () => {
        runWithConfig(reactDir, 'i18n-po-extractor-common.json');
        const homeKeys = getKeys(parsePo(join(reactDir, 'locales/en/Home.po')));
        if (!homeKeys.includes('heroTitle')) throw new Error('heroTitle missing from Home.po');
        if (homeKeys.includes('pageTitle')) throw new Error('pageTitle should not be in Home.po');
        cleanupProject(reactDir);
    });

    // warning scenario 1 — static namespace, duplicate keys, no commonOutput
    it('warns about duplicate keys across files with static namespace and no commonOutput', () => {
        const result = runWithConfig(reactDir, 'i18n-po-extractor-static-ns.json');
        const output = result.stdout + result.stderr;
        if (!output.includes('COMMON USAGE')) throw new Error('No COMMON USAGE warning');
        if (!output.includes('pageTitle')) throw new Error('pageTitle not mentioned in warning');
        cleanupProject(reactDir);
    });

    // warning scenario 2 — namespaceInKey: true, keys without separator, no commonOutput
    it('warns about unseparated keys with namespaceInKey and no commonOutput', () => {
        const result = runWithConfig(custom1Dir, 'i18n-po-extractor-no-common.json');
        const output = result.stdout + result.stderr;
        if (!output.includes('COMMON USAGE')) throw new Error('No COMMON USAGE warning');
        if (!output.includes('CANCEL')) throw new Error('CANCEL not mentioned in warning');
        cleanupProject(custom1Dir);
    });

    // no warning when commonUsageValidation is null
    it('no common usage warning when commonUsageValidation is null', () => {
        const result = runWithConfig(reactDir, 'i18n-po-extractor-no-common-usage-validation.json');
        const output = result.stdout + result.stderr;
        if (output.includes('COMMON USAGE')) throw new Error('Unexpected COMMON USAGE warning');
        cleanupProject(reactDir);
    });
}
