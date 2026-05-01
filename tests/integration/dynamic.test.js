import {it} from 'node:test';
import {join} from 'node:path';
import {writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {projectDir, fakeProjectsDir, bin, run, parsePo, getKeys} from '../helpers.js';

function runForbidDynamic() {
    const config = {
        locales: ['en'],
        markers: ['t'],
        forbidDynamic: true,
        namespaceInKey: true,
        namespaceSeparator: '.',
        keyValidation: {sentenceNameConvention: null, behavior: null},
        scans: [
            {path: 'src/components', namespace: '{firstFolderName}', output: '{firstFolderPath}/i18n/{firstFolderName}.{locale}.po', extensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'vue'], commonOutput: 'src/i18n/common.{locale}.po'},
            {path: 'src/pages', namespace: '{firstFolderName}', output: '{firstFolderPath}/i18n/{firstFolderName}.{locale}.po', extensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'vue']},
        ],
    };
    const configPath = join(projectDir, 'i18n-po-extractor-forbid.json');
    writeFileSync(configPath, JSON.stringify(config, null, 4));
    const result = spawnSync('node', [bin, '--config', configPath], {
        encoding: 'utf-8',
        cwd: projectDir,
    });
    return {code: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? ''};
}

export default function () {
    it('warns about dynamic keys by default', () => {
        const result = run();
        const output = result.stdout + result.stderr;
        if (!output.includes('DYNAMIC KEYS')) throw new Error('No dynamic key warning');
    });

    it('does not extract dynamic keys', () => {
        const settingsPo = join(projectDir, 'src/components/Settings/i18n/Settings.en.po');
        const keys = getKeys(parsePo(settingsPo));
        if (keys.some((k) => k.includes('${'))) throw new Error('Dynamic expression found in keys');
    });

    it('forbidDynamic exits with code 1 when dynamic keys found', () => {
        const result = runForbidDynamic();
        if (result.code !== 1) throw new Error(`Expected exit 1, got ${result.code}`);
    });

    it('forbidDynamic shows error label not warning', () => {
        const result = runForbidDynamic();
        const output = result.stdout + result.stderr;
        if (!output.includes('forbidden')) throw new Error('No "forbidden" label in forbidDynamic output');
    });
}
