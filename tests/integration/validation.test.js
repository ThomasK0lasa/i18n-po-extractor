import {it} from 'node:test';
import {join} from 'node:path';
import {writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {projectDir, bin} from '../helpers.js';

function runWithValidation(convention, behavior = 'warn', extra = {}) {
    const config = {
        locales: ['en'],
        markers: ['t'],
        namespaceInKey: true,
        namespaceSeparator: '.',
        keyValidation: {sentenceNameConvention: convention, behavior, ...extra},
        scans: [
            {path: 'src/components', namespace: '{firstFolderName}', output: '{firstFolderPath}/i18n/{firstFolderName}.{locale}.po', extensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'vue'], commonOutput: 'src/i18n/common.{locale}.po'},
            {path: 'src/pages', namespace: '{firstFolderName}', output: '{firstFolderPath}/i18n/{firstFolderName}.{locale}.po', extensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'vue']},
        ],
    };
    const configPath = join(projectDir, 'i18n-po-extractor-validation.json');
    writeFileSync(configPath, JSON.stringify(config, null, 4));
    const result = spawnSync('node', [bin, '--config', configPath], {
        encoding: 'utf-8',
        cwd: projectDir,
    });
    return {code: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? ''};
}

export default function () {
    it('no violations when convention is null', () => {
        const result = runWithValidation(null);
        if ((result.stdout + result.stderr).includes('KEY FORMAT')) throw new Error('Unexpected KEY FORMAT violations');
    });

    it('detects violations for SCREAMING_SNAKE_CASE when keys dont match', () => {
        // fake-project-custom-1 uses SCREAMING_SNAKE_CASE correctly — no violations expected
        const result = runWithValidation('SCREAMING_SNAKE_CASE', 'warn');
        // CANCEL, SAVE are valid SCREAMING_SNAKE_CASE
        if (result.code !== 0) throw new Error(`Expected exit 0, got ${result.code}\n${result.stderr}`);
    });

    it('detects violations for camelCase when keys are SCREAMING_SNAKE_CASE', () => {
        // all keys are SCREAMING_SNAKE_CASE so camelCase convention should flag them
        const result = runWithValidation('camelCase', 'warn');
        const output = result.stdout + result.stderr;
        if (!output.includes('KEY FORMAT')) throw new Error('Expected KEY FORMAT violations for camelCase on SCREAMING keys');
    });

    it('behavior warn exits 0 with violations', () => {
        const result = runWithValidation('camelCase', 'warn');
        if (result.code !== 0) throw new Error(`Expected exit 0 in warn mode, got ${result.code}`);
    });

    it('behavior error exits 1 with violations', () => {
        const result = runWithValidation('camelCase', 'error');
        if (result.code !== 1) throw new Error(`Expected exit 1 in error mode, got ${result.code}`);
    });

    it('custom regex in sentenceNameConvention validates correctly', () => {
        // only allow all lowercase — should flag SCREAMING_SNAKE_CASE keys
        const result = runWithValidation('^[a-z][a-z0-9]*$', 'warn');
        const output = result.stdout + result.stderr;
        if (!output.includes('KEY FORMAT')) throw new Error('No violations for lowercase-only regex on SCREAMING keys');
    });

    it('sentenceSeparator conflict with convention internal separator exits 1', () => {
        const result = runWithValidation('SCREAMING_SNAKE_CASE', 'warn', {sentenceSeparator: '_'});
        if (result.code !== 1) throw new Error(`Expected exit 1 for conflicting separator, got ${result.code}`);
    });

    it('sentenceSeparator conflict shows helpful suggestions', () => {
        const result = runWithValidation('snake_case', 'warn', {sentenceSeparator: '_'});
        if (!(result.stdout + result.stderr).includes('Suggestions')) throw new Error('No suggestions shown');
    });

    it('custom regex conflict with sentenceSeparator exits 1', () => {
        const result = runWithValidation('^[A-Z_]+$', 'warn', {sentenceSeparator: '_'});
        if (result.code !== 1) throw new Error(`Expected exit 1 for conflicting custom regex, got ${result.code}`);
    });

    it('custom regex no conflict when separator not matched', () => {
        const result = runWithValidation('^[A-Z]+$', 'warn', {sentenceSeparator: '.'});
        if ((result.stdout + result.stderr).includes('conflicts')) throw new Error('Unexpected conflict error');
    });

    it('non-conflicting sentenceSeparator works correctly', () => {
        const result = runWithValidation('SCREAMING_SNAKE_CASE', 'warn', {sentenceSeparator: '.'});
        if ((result.stdout + result.stderr).includes('conflicts')) throw new Error('Incorrectly flagged as conflict');
    });
}
