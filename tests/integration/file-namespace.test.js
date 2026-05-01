import {it} from 'node:test';
/**
 * Tests for per-file namespace detection and ns: routing with two-pass scan.
 */
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {runIn, parsePo, getKeys, cleanupProject, bin, fakeProjectsDir} from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// fake-project-react uses useTranslation('Button') etc — file boundary
const reactDir = join(__dirname, '..', 'fixtures', 'fake-project-react');

export default function () {
    it('useTranslation() namespace routes keys to correct .po file', () => {
        cleanupProject(reactDir);
        runIn(reactDir);
        // Button.tsx has useTranslation('Button') — keys should go to Button.po
        const buttonPo = join(reactDir, 'locales/en/Button.po');
        if (!existsSync(buttonPo)) throw new Error('Button.po not created');
        const keys = getKeys(parsePo(buttonPo));
        if (!keys.includes('confirm')) throw new Error('confirm not in Button.po');
        if (!keys.includes('cancel')) throw new Error('cancel not in Button.po');
    });

    it('useTranslation() sets correct X-Namespace header', () => {
        const buttonPo = join(reactDir, 'locales/en/Button.po');
        const data = parsePo(buttonPo);
        if (data?.headers?.['X-Namespace'] !== 'Button') {
            throw new Error(`Expected X-Namespace Button, got ${data?.headers?.['X-Namespace']}`);
        }
    });

    it('unknown ns: value warns and skips key', () => {
        // create a temp file with ns: 'nonexistent'
        const tmpFile = join(reactDir, 'src/components/TempNs.tsx');
        writeFileSync(tmpFile, `
import {useTranslation} from 'react-i18next';
export function Temp() {
    const {t} = useTranslation('Temp');
    return t('tempKey', {ns: 'nonexistent'});
}
`);
        // add TempNs to config scan
        const configPath = join(reactDir, 'i18n-po-extractor.json');
        const result = spawnSync('node', [bin, '--config', configPath], {
            encoding: 'utf-8', cwd: reactDir,
        });
        const output = result.stdout + result.stderr;
        if (!output.includes('UNKNOWN NAMESPACE')) throw new Error('No UNKNOWN NAMESPACE warning');
        if (!output.includes('nonexistent')) throw new Error('Unknown ns name not shown in warning');
        rmSync(tmpFile);
    });

    it('per-file namespace from useTranslation overrides folder-derived namespace', () => {
        // In fake-project-react, Button.tsx uses useTranslation('Button')
        // The file boundary would also derive 'Button' from filename — so they match here
        // But we can verify key isolation proves routing works
        const buttonPo = join(reactDir, 'locales/en/Button.po');
        const modalPo = join(reactDir, 'locales/en/Modal.po');
        const buttonKeys = getKeys(parsePo(buttonPo));
        const modalKeys = getKeys(parsePo(modalPo));
        // Modal keys should not be in Button
        if (buttonKeys.includes('title')) throw new Error('Modal title leaked into Button');
        if (modalKeys.includes('confirm')) throw new Error('Button confirm leaked into Modal');
    });

    it('two-pass: keys from all scans available for ns routing', () => {
        // In fake-project-custom-2: components and pages are separate scans
        // A file in components could theoretically use useTranslation from pages namespace
        // Pass 1 builds the full map so cross-scan routing works
        const custom2Dir = join(__dirname, '..', 'fixtures', 'fake-project-custom-2');
        const result = runIn(custom2Dir);
        if (result.code !== 0) throw new Error(`Expected exit 0, got ${result.code}\n${result.stderr}`);
    });

    it('namespaceValidationBehavior warn reports mismatch', () => {
        const tmpFile = join(reactDir, 'src/components/TempOverride.tsx');
        writeFileSync(tmpFile, `
import {useTranslation} from 'react-i18next';
export function Temp() {
    const {t} = useTranslation('NonExistentNs');
    return t('someKey');
}
`);
        const configPath = join(reactDir, 'i18n-po-extractor.json');
        const result = spawnSync('node', [bin, '--config', configPath], {
            encoding: 'utf-8', cwd: reactDir,
            env: {...process.env},
        });
        // namespaceValidationBehavior defaults to 'warn' — mismatch should be reported
        const output = result.stdout + result.stderr;
        if (!output.includes('NAMESPACE OVERRIDE MISMATCH')) throw new Error('Expected NAMESPACE OVERRIDE MISMATCH warning by default');
        rmSync(tmpFile);
    });

    it('namespaceValidationBehavior warn exits 0', () => {
        const tmpFile = join(reactDir, 'src/components/TempOverride.tsx');
        writeFileSync(tmpFile, `
import {useTranslation} from 'react-i18next';
export function Temp() {
    const {t} = useTranslation('NonExistentNs');
    return t('someKey');
}
`);
        const tmpConfig = join(reactDir, 'i18n-po-extractor-ns-warn.json');
        const base = JSON.parse(readFileSync(join(reactDir, 'i18n-po-extractor.json'), 'utf-8'));
        writeFileSync(tmpConfig, JSON.stringify({...base, namespaceValidationBehavior: 'warn'}));
        const result = spawnSync('node', [bin, '--config', tmpConfig], {encoding: 'utf-8', cwd: reactDir});
        rmSync(tmpFile);
        rmSync(tmpConfig);
        if (result.status !== 0) throw new Error(`Expected exit 0 for warn mode, got ${result.status}`);
    });

    it('namespaceValidationBehavior error exits 1 on mismatch', () => {
        const tmpFile = join(reactDir, 'src/components/TempOverride.tsx');
        writeFileSync(tmpFile, `
import {useTranslation} from 'react-i18next';
export function Temp() {
    const {t} = useTranslation('NonExistentNs');
    return t('someKey');
}
`);
        const tmpConfig = join(reactDir, 'i18n-po-extractor-ns-error.json');
        const base = JSON.parse(readFileSync(join(reactDir, 'i18n-po-extractor.json'), 'utf-8'));
        writeFileSync(tmpConfig, JSON.stringify({...base, namespaceValidationBehavior: 'error'}));
        const result = spawnSync('node', [bin, '--config', tmpConfig], {encoding: 'utf-8', cwd: reactDir});
        rmSync(tmpFile);
        rmSync(tmpConfig);
        if (result.status !== 1) throw new Error(`Expected exit 1 for error mode, got ${result.status}`);
        if (!(result.stdout + result.stderr).includes('NAMESPACE OVERRIDE MISMATCH')) {
            throw new Error('Expected NAMESPACE OVERRIDE MISMATCH in error output');
        }
    });

    it('namespaceValidationBehavior null suppresses mismatch warning', () => {
        const tmpFile = join(reactDir, 'src/components/TempOverride.tsx');
        writeFileSync(tmpFile, `
import {useTranslation} from 'react-i18next';
export function Temp() {
    const {t} = useTranslation('NonExistentNs');
    return t('someKey');
}
`);
        const tmpConfig = join(reactDir, 'i18n-po-extractor-ns-null.json');
        const base = JSON.parse(readFileSync(join(reactDir, 'i18n-po-extractor.json'), 'utf-8'));
        writeFileSync(tmpConfig, JSON.stringify({...base, namespaceValidationBehavior: null}));
        const result = spawnSync('node', [bin, '--config', tmpConfig], {encoding: 'utf-8', cwd: reactDir});
        rmSync(tmpFile);
        rmSync(tmpConfig);
        if ((result.stdout + result.stderr).includes('NAMESPACE OVERRIDE MISMATCH')) {
            throw new Error('Expected no warning when namespaceValidationBehavior is null');
        }
    });

    it('file-level i18n-extract-external suppresses NAMESPACE OVERRIDE MISMATCH', () => {
        const tmpFile = join(reactDir, 'src/components/TempExternal.tsx');
        writeFileSync(tmpFile, `
import {useTranslation} from 'react-i18next';
export function Temp() {
    // i18n-extract-external
    const {t} = useTranslation('ExternalPkg');
    return t('pkg.someKey');
}
`);
        const configPath = join(reactDir, 'i18n-po-extractor.json');
        const result = spawnSync('node', [bin, '--config', configPath], {encoding: 'utf-8', cwd: reactDir});
        rmSync(tmpFile);
        const output = result.stdout + result.stderr;
        if (output.includes('NAMESPACE OVERRIDE MISMATCH')) throw new Error('Expected no NAMESPACE OVERRIDE MISMATCH for external file');
        if (output.includes('UNKNOWN NAMESPACE')) throw new Error('Expected no UNKNOWN NAMESPACE for external file');
    });

    it('file-level i18n-extract-external reports in EXTERNAL NAMESPACE section', () => {
        const tmpFile = join(reactDir, 'src/components/TempExternal.tsx');
        writeFileSync(tmpFile, `
import {useTranslation} from 'react-i18next';
export function Temp() {
    /* i18n-extract-external */
    const {t} = useTranslation('ExternalPkg');
    return t('pkg.keyA', {ns: 'ExternalPkg'});
}
`);
        const configPath = join(reactDir, 'i18n-po-extractor.json');
        const result = spawnSync('node', [bin, '--config', configPath], {encoding: 'utf-8', cwd: reactDir});
        rmSync(tmpFile);
        const output = result.stdout + result.stderr;
        if (!output.includes('EXTERNAL NAMESPACE')) throw new Error('Expected EXTERNAL NAMESPACE section in output');
        if (!output.includes('ExternalPkg')) throw new Error('Expected ExternalPkg listed in EXTERNAL NAMESPACE section');
    });

    it('file-level i18n-extract-external still warns for keys using a different ns', () => {
        const tmpFile = join(reactDir, 'src/components/TempExternal.tsx');
        writeFileSync(tmpFile, `
import {useTranslation} from 'react-i18next';
export function Temp() {
    /* i18n-extract-external */
    const {t} = useTranslation('ExternalPkg');
    return t('pkg.keyA', {ns: 'SomeOtherUnknown'});
}
`);
        const configPath = join(reactDir, 'i18n-po-extractor.json');
        const result = spawnSync('node', [bin, '--config', configPath], {encoding: 'utf-8', cwd: reactDir});
        rmSync(tmpFile);
        const output = result.stdout + result.stderr;
        if (!output.includes('UNKNOWN NAMESPACE')) throw new Error('Expected UNKNOWN NAMESPACE warning for different ns on external file');
    });
}
