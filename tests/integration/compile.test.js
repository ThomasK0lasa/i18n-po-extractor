import {it, before, after} from 'node:test';
import {existsSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {runIn, cleanupProject, fakeProjectsDir} from '../helpers.js';

const simpleSpaDir = join(fakeProjectsDir, 'fake-project-simple-spa');
const configPath = join(simpleSpaDir, 'i18n-po-extractor.json');
const originalConfig = readFileSync(configPath, 'utf-8');

/**
 * Build a config with compile settings merged in.
 *
 * @param overrides compile config overrides
 * @param scanOverrides per-scan config overrides
 * @returns config object
 */
function makeConfig(overrides = {}, scanOverrides = {}) {
    const base = JSON.parse(originalConfig);
    base.compile = {format: 'json', compatibilityJSON: 'v4', skipUntranslated: true, ...overrides};
    base.scans[0] = {...base.scans[0], ...scanOverrides};
    return base;
}

/**
 * Write a temporary config and run the CLI.
 *
 * @param config config object to write
 * @param extraArgs additional CLI arguments
 * @returns {{ code, stdout, stderr }}
 */
function runWithCompile(config, ...extraArgs) {
    writeFileSync(configPath, JSON.stringify(config, null, 4));
    return runIn(simpleSpaDir, ...extraArgs);
}

export default function () {
    after(() => {
        writeFileSync(configPath, originalConfig);
        cleanupProject(simpleSpaDir);
    });

    it('compiles .po to .json by default', () => {
        cleanupProject(simpleSpaDir);
        const result = runWithCompile(makeConfig());
        assertExitOk(result);

        const jsonPath = join(simpleSpaDir, 'public/i18n/translation.en.json');
        assertFileExists(jsonPath);

        const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
        assertIsObject(data);
    });

    it('compiles .po for all locales', () => {
        cleanupProject(simpleSpaDir);
        runWithCompile(makeConfig());

        const enPath = join(simpleSpaDir, 'public/i18n/translation.en.json');
        const frPath = join(simpleSpaDir, 'public/i18n/translation.fr.json');
        assertFileExists(enPath);
        assertFileExists(frPath);
    });

    it('compiles .po to .js (ES module)', () => {
        cleanupProject(simpleSpaDir);
        const result = runWithCompile(makeConfig({format: 'js'}));
        assertExitOk(result);

        const jsPath = join(simpleSpaDir, 'public/i18n/translation.en.js');
        assertFileExists(jsPath);

        const content = readFileSync(jsPath, 'utf-8');
        if (!content.startsWith('export default ')) {
            throw new Error('JS output should start with "export default"');
        }
    });

    it('compiles .po to .mo (binary)', () => {
        cleanupProject(simpleSpaDir);
        const result = runWithCompile(makeConfig({format: 'mo'}));
        assertExitOk(result);

        const moPath = join(simpleSpaDir, 'public/i18n/translation.en.mo');
        assertFileExists(moPath);

        // MO files start with magic number 0x950412de (LE) or 0xde120495 (BE)
        const buf = readFileSync(moPath);
        const magic = buf.readUInt32LE(0);
        if (magic !== 0x950412de && magic !== 0xde120495) {
            throw new Error(`Invalid MO magic: 0x${magic.toString(16)}`);
        }
    });

    it('uses compileOutput template when set', () => {
        cleanupProject(simpleSpaDir);
        const config = makeConfig({}, {compileOutput: 'locales/{locale}/messages.{format}'});
        const result = runWithCompile(config);
        assertExitOk(result);

        const outPath = join(simpleSpaDir, 'locales/en/messages.json');
        assertFileExists(outPath);
    });

    it('--no-compile skips compilation', () => {
        cleanupProject(simpleSpaDir);
        const result = runWithCompile(makeConfig(), '--no-compile');
        assertExitOk(result);

        const jsonPath = join(simpleSpaDir, 'public/i18n/translation.en.json');
        if (existsSync(jsonPath)) {
            throw new Error('--no-compile should not create compiled files');
        }
    });

    it('--dry-run does not write compiled files', () => {
        cleanupProject(simpleSpaDir);
        const result = runWithCompile(makeConfig(), '--dry-run');
        assertExitOk(result);

        const jsonPath = join(simpleSpaDir, 'public/i18n/translation.en.json');
        if (existsSync(jsonPath)) {
            throw new Error('--dry-run should not create compiled files');
        }
    });

    it('--dry-run reports would-compile paths', () => {
        cleanupProject(simpleSpaDir);
        const result = runWithCompile(makeConfig(), '--dry-run');
        const output = result.stdout + result.stderr;
        if (!output.includes('would compile')) {
            throw new Error('Expected "would compile" in dry-run output');
        }
    });

    it('compiles by default even without explicit compile config', () => {
        cleanupProject(simpleSpaDir);
        // Run with original config (no compile key) — defaults kick in
        writeFileSync(configPath, originalConfig);
        const result = runIn(simpleSpaDir);
        assertExitOk(result);

        const jsonPath = join(simpleSpaDir, 'public/i18n/translation.en.json');
        assertFileExists(jsonPath);
    });

    it('compile: null disables compilation', () => {
        cleanupProject(simpleSpaDir);
        const config = JSON.parse(originalConfig);
        config.compile = null;
        writeFileSync(configPath, JSON.stringify(config, null, 4));
        const result = runIn(simpleSpaDir);
        assertExitOk(result);

        const jsonPath = join(simpleSpaDir, 'public/i18n/translation.en.json');
        if (existsSync(jsonPath)) {
            throw new Error('compile: null should disable compilation');
        }
    });

    it('skipUntranslated omits empty translations', () => {
        cleanupProject(simpleSpaDir);
        const result = runWithCompile(makeConfig({skipUntranslated: true}));
        assertExitOk(result);

        // All entries in a fresh .po have empty msgstr, so with
        // skipUntranslated: true the JSON should be empty or very small
        const jsonPath = join(simpleSpaDir, 'public/i18n/translation.en.json');
        const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
        const keys = Object.keys(data);
        // Fresh .po has no translations, so all should be skipped
        if (keys.length !== 0) {
            throw new Error(`Expected empty JSON with skipUntranslated, got ${keys.length} keys`);
        }
    });

    it('skipUntranslated false keeps empty translations', () => {
        cleanupProject(simpleSpaDir);
        const result = runWithCompile(makeConfig({skipUntranslated: false}));
        assertExitOk(result);

        const jsonPath = join(simpleSpaDir, 'public/i18n/translation.en.json');
        const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
        const keys = Object.keys(data);
        // With skipUntranslated false, keys should be present even without translations
        if (keys.length === 0) {
            throw new Error('Expected non-empty JSON with skipUntranslated: false');
        }
    });

    it('reports compile summary in output', () => {
        cleanupProject(simpleSpaDir);
        const result = runWithCompile(makeConfig());
        const output = result.stdout + result.stderr;
        if (!output.includes('Compile:') || !output.includes('.json')) {
            throw new Error('Expected compile summary with format in output');
        }
    });

    it('rejects invalid compile format', () => {
        cleanupProject(simpleSpaDir);
        const result = runWithCompile(makeConfig({format: 'xml'}));
        if (result.code === 0) {
            throw new Error('Expected non-zero exit for invalid format');
        }
        const output = result.stdout + result.stderr;
        if (!output.includes('Invalid compile.format')) {
            throw new Error('Expected error message about invalid format');
        }
    });

    it('rejects invalid format inside array', () => {
        cleanupProject(simpleSpaDir);
        const result = runWithCompile(makeConfig({format: ['json', 'xml']}));
        if (result.code === 0) {
            throw new Error('Expected non-zero exit for invalid format in array');
        }
        const output = result.stdout + result.stderr;
        if (!output.includes('Invalid compile.format')) {
            throw new Error('Expected error message about invalid format');
        }
    });

    it('compiles to multiple formats with format array', () => {
        cleanupProject(simpleSpaDir);
        const result = runWithCompile(makeConfig({format: ['json', 'mo']}));
        assertExitOk(result);

        const jsonPath = join(simpleSpaDir, 'public/i18n/translation.en.json');
        const moPath = join(simpleSpaDir, 'public/i18n/translation.en.mo');
        assertFileExists(jsonPath);
        assertFileExists(moPath);
    });

    it('compileOutput with {format} placeholder resolves per format', () => {
        cleanupProject(simpleSpaDir);
        const config = makeConfig(
            {format: ['json', 'mo']},
            {compileOutput: 'locales/{locale}/messages.{format}'},
        );
        const result = runWithCompile(config);
        assertExitOk(result);

        const jsonPath = join(simpleSpaDir, 'locales/en/messages.json');
        const moPath = join(simpleSpaDir, 'locales/en/messages.mo');
        assertFileExists(jsonPath);
        assertFileExists(moPath);
    });

    it('compileOutput auto-adds dot before {format} when missing', () => {
        cleanupProject(simpleSpaDir);
        const config = makeConfig(
            {format: 'json'},
            {compileOutput: 'locales/{locale}/messages{format}'},
        );
        const result = runWithCompile(config);
        assertExitOk(result);

        const jsonPath = join(simpleSpaDir, 'locales/en/messages.json');
        assertFileExists(jsonPath);
    });

    it('compileOutput without {format} appends .format at end', () => {
        cleanupProject(simpleSpaDir);
        const config = makeConfig(
            {format: ['json', 'mo']},
            {compileOutput: 'locales/{locale}/translations'},
        );
        const result = runWithCompile(config);
        assertExitOk(result);

        const jsonPath = join(simpleSpaDir, 'locales/en/translations.json');
        const moPath = join(simpleSpaDir, 'locales/en/translations.mo');
        assertFileExists(jsonPath);
        assertFileExists(moPath);
    });
}


// --- assertions ---

function assertExitOk(result) {
    if (result.code !== 0) {
        throw new Error(`Expected exit 0, got ${result.code}\n${result.stderr}`);
    }
}

function assertFileExists(filePath) {
    if (!existsSync(filePath)) {
        throw new Error(`Expected file to exist: ${filePath}`);
    }
}

function assertIsObject(value) {
    if (typeof value !== 'object' || value === null) {
        throw new Error(`Expected object, got ${typeof value}`);
    }
}
