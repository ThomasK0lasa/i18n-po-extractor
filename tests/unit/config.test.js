import {it} from 'node:test';
import {loadConfig} from '../../lib/config.js';
import {join, dirname} from 'node:path';
import {writeFileSync, rmSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpDir = join(__dirname, 'tmp-config');

const OUTPUT = '{firstFolderPath}/i18n/{firstFolderName}.{locale}.po';

function writeConfig(name, content) {
    mkdirSync(tmpDir, {recursive: true});
    const path = join(tmpDir, name);
    writeFileSync(path, JSON.stringify(content));
    return path;
}

function cleanup() {
    try { rmSync(tmpDir, {recursive: true}); } catch {}
}

function expectExit1(fn) {
    let exitCode = null;
    const origExit = process.exit;
    const origError = console.error;
    process.exit = (code) => { exitCode = code; throw new Error('exit'); };
    console.error = () => {};
    try { fn(); } catch {}
    process.exit = origExit;
    console.error = origError;
    return exitCode;
}

export default function () {
    it('loadConfig applies defaults for missing optional fields', () => {
        const path = writeConfig('basic.json', {
            locales: ['en'],
            scans: [{path: 'src/components', namespace: '{firstFolderName}', output: OUTPUT}],
        });
        const {config} = loadConfig(['--config', path], tmpDir);
        if (!config.markers?.includes('t')) throw new Error('Expected default marker t');
        if (config.namespaceInKey !== false) throw new Error('Expected namespaceInKey false by default');
        if (config.namespaceSeparator !== null) throw new Error('Expected namespaceSeparator null by default');
        cleanup();
    });

    it('loadConfig normalizes string folder shorthand', () => {
        const path = writeConfig('shorthand.json', {
            scans: ['src/components', 'src/pages'],
        });
        // string shorthand scans have no output — expect exit(1)
        if (expectExit1(() => loadConfig(['--config', path], tmpDir)) !== 1) {
            throw new Error('Expected exit(1) for missing namespace');
        }
        cleanup();
    });

    it('loadConfig deep merges keyValidation with defaults', () => {
        const path = writeConfig('kv.json', {
            locales: ['en'],
            scans: [{path: 'src', namespace: '{firstFolderName}', output: OUTPUT}],
            keyValidation: {sentenceNameConvention: 'SCREAMING_SNAKE_CASE'},
        });
        const {config} = loadConfig(['--config', path], tmpDir);
        if (config.keyValidation.sentenceNameConvention !== 'SCREAMING_SNAKE_CASE') {
            throw new Error('sentenceNameConvention not set');
        }
        if (config.keyValidation.behavior !== 'warn') throw new Error('behavior default should be warn');
        cleanup();
    });

    it('loadConfig applies folder defaults for each folder', () => {
        const path = writeConfig('folderdefaults.json', {
            locales: ['en'],
            scans: [{path: 'src/components', namespace: '{lastFolderName}', output: OUTPUT}],
        });
        const {config} = loadConfig(['--config', path], tmpDir);
        const scan = config.scans[0];
        if (scan.commonOutput !== null) throw new Error('common default should be null');
        cleanup();
    });

    it('loadConfig exits when output is missing from folder', () => {
        const path = writeConfig('nooutput.json', {
            scans: [{path: 'src/components', namespace: '{firstFolderName}'}],
        });
        if (expectExit1(() => loadConfig(['--config', path], tmpDir)) !== 1) {
            throw new Error('Expected exit(1) for missing output');
        }
        cleanup();
    });

    it('loadConfig exits when locales is missing', () => {
        const path = writeConfig('nolocales.json', {
            scans: [{path: 'src/components', namespace: '{firstFolderName}', output: OUTPUT}],
        });
        if (expectExit1(() => loadConfig(['--config', path], tmpDir)) !== 1) {
            throw new Error('Expected exit(1) for missing locales');
        }
        cleanup();
    });

    it('loadConfig exits when no scans configured', () => {
        const path = writeConfig('nofolders.json', {locales: ['en']});
        if (expectExit1(() => loadConfig(['--config', path], tmpDir)) !== 1) {
            throw new Error('Expected exit(1) for no scans');
        }
        cleanup();
    });

    it('loadConfig reads from package.json key', () => {
        mkdirSync(tmpDir, {recursive: true});
        const pkgPath = join(tmpDir, 'package.json');
        writeFileSync(pkgPath, JSON.stringify({
            name: 'test',
            'i18n-po-extractor': {locales: ['en'], scans: [{path: 'src', namespace: '{firstFolderName}', output: OUTPUT}]},
        }));
        const {config} = loadConfig([], tmpDir);
        if (config.scans[0].path !== 'src') throw new Error('Did not read from package.json');
        cleanup();
    });

    it('loadConfig does not exit when behavior is set without sentenceNameConvention', () => {
        const path = writeConfig('kv-no-convention.json', {
            locales: ['en'],
            scans: [{path: 'src', namespace: '{firstFolderName}', output: OUTPUT}],
            keyValidation: {behavior: 'warn'},
        });
        let exited = false;
        const origExit = process.exit;
        process.exit = () => { exited = true; throw new Error('exit'); };
        try { loadConfig(['--config', path], tmpDir); } catch {}
        process.exit = origExit;
        if (exited) throw new Error('Expected no exit when behavior set without sentenceNameConvention');
        cleanup();
    });

    it('loadConfig does not exit for non-conflicting keyValidation', () => {
        const path = writeConfig('kv-valid.json', {
            locales: ['en'],
            scans: [{path: 'src', namespace: '{firstFolderName}', output: OUTPUT}],
            keyValidation: {sentenceNameConvention: 'SCREAMING_SNAKE_CASE', sentenceSeparator: '.', behavior: 'warn'},
        });
        let threw = false;
        try { loadConfig(['--config', path], tmpDir); } catch { threw = true; }
        if (threw) throw new Error('Should not exit for non-conflicting keyValidation');
        cleanup();
    });

    it('loadConfig exits on conflicting sentenceSeparator for known convention', () => {
        const path = writeConfig('kv-conflict.json', {
            locales: ['en'],
            scans: [{path: 'src', namespace: '{firstFolderName}', output: OUTPUT}],
            keyValidation: {sentenceNameConvention: 'SCREAMING_SNAKE_CASE', sentenceSeparator: '_', behavior: 'warn'},
        });
        if (expectExit1(() => loadConfig(['--config', path], tmpDir)) !== 1) {
            throw new Error('Expected exit(1) for conflicting sentenceSeparator');
        }
        cleanup();
    });

    it('loadConfig exits on conflicting sentenceSeparator for custom regex', () => {
        const path = writeConfig('kv-regex.json', {
            locales: ['en'],
            scans: [{path: 'src', namespace: '{firstFolderName}', output: OUTPUT}],
            keyValidation: {sentenceNameConvention: '^[A-Z_]+$', sentenceSeparator: '_', behavior: 'warn'},
        });
        if (expectExit1(() => loadConfig(['--config', path], tmpDir)) !== 1) {
            throw new Error('Expected exit(1) for custom regex conflict');
        }
        cleanup();
    });

    it('loadConfig exits when commonOutput contains {firstFolderName}', () => {
        const path = writeConfig('common-firstfolder.json', {
            locales: ['en'],
            scans: [{path: 'src', namespace: '{firstFolderName}', output: OUTPUT, commonOutput: '{firstFolderName}/i18n/common.{locale}.po'}],
        });
        if (expectExit1(() => loadConfig(['--config', path], tmpDir)) !== 1) {
            throw new Error('Expected exit(1) for commonOutput with {firstFolderName}');
        }
        cleanup();
    });

    it('loadConfig exits when commonOutput contains {lastFolderName}', () => {
        const path = writeConfig('common-lastfolder.json', {
            locales: ['en'],
            scans: [{path: 'src', namespace: '{firstFolderName}', output: OUTPUT, commonOutput: '{lastFolderName}/i18n/common.{locale}.po'}],
        });
        if (expectExit1(() => loadConfig(['--config', path], tmpDir)) !== 1) {
            throw new Error('Expected exit(1) for commonOutput with {lastFolderName}');
        }
        cleanup();
    });
    it('loadConfig exits when output is missing {locale}', () => {
        const p = writeConfig('output-no-locale.json', {
            locales: ['en'],
            scans: [{path: 'src', namespace: '{firstFolderName}', output: '{firstFolderPath}/i18n/{firstFolderName}.po'}],
        });
        if (expectExit1(() => loadConfig(['--config', p], tmpDir)) !== 1) {
            throw new Error('Expected exit(1) for output missing {locale}');
        }
        cleanup();
    });

    it('loadConfig exits when commonOutput is missing {locale}', () => {
        const OUTPUT = '{firstFolderPath}/i18n/{firstFolderName}.{locale}.po';
        const p = writeConfig('common-no-locale.json', {
            locales: ['en'],
            scans: [{path: 'src', namespace: '{firstFolderName}', output: OUTPUT, commonOutput: 'src/i18n/common.po'}],
        });
        if (expectExit1(() => loadConfig(['--config', p], tmpDir)) !== 1) {
            throw new Error('Expected exit(1) for commonOutput missing {locale}');
        }
        cleanup();
    });

    it('loadConfig exits when commonOutput contains file-level placeholder {fileName}', () => {
        const OUTPUT = '{firstFolderPath}/i18n/{firstFolderName}.{locale}.po';
        const p = writeConfig('common-filename.json', {
            locales: ['en'],
            scans: [{path: 'src', namespace: '{firstFolderName}', output: OUTPUT, commonOutput: 'src/i18n/{fileName}.{locale}.po'}],
        });
        if (expectExit1(() => loadConfig(['--config', p], tmpDir)) !== 1) {
            throw new Error('Expected exit(1) for commonOutput with {fileName}');
        }
        cleanup();
    });

    it('loadConfig exits when commonNamespace set without commonOutput', () => {
        const OUTPUT = '{firstFolderPath}/i18n/{firstFolderName}.{locale}.po';
        const p = writeConfig('common-ns-no-output.json', {
            locales: ['en'],
            scans: [{path: 'src', namespace: '{firstFolderName}', output: OUTPUT, commonNamespace: 'shared'}],
        });
        if (expectExit1(() => loadConfig(['--config', p], tmpDir)) !== 1) {
            throw new Error('Expected exit(1) for commonNamespace without commonOutput');
        }
        cleanup();
    });
}