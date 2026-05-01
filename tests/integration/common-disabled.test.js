import {it} from 'node:test';
import {join} from 'node:path';
import {writeFileSync, existsSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {projectDir, bin, parsePo, getKeys} from '../helpers.js';

function runNoCommon() {
    const config = {
        locales: ['en'],
        markers: ['t'],
        namespaceInKey: true,
        namespaceSeparator: '.',
        scans: [
            {path: 'src/components', namespace: '{firstFolderName}', output: '{firstFolderPath}/i18n/{firstFolderName}.{locale}.po', extensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'vue'], commonOutput: null},
            {path: 'src/pages', namespace: '{firstFolderName}', output: '{firstFolderPath}/i18n/{firstFolderName}.{locale}.po', extensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'vue']},
        ],
    };
    const configPath = join(projectDir, 'i18n-po-extractor-no-common.json');
    writeFileSync(configPath, JSON.stringify(config, null, 4));
    const result = spawnSync('node', [bin, '--config', configPath], {
        encoding: 'utf-8',
        cwd: projectDir,
    });
    return {code: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? ''};
}

export default function () {
    it('exits with code 0 when common is null', () => {
        const result = runNoCommon();
        if (result.code !== 0) throw new Error(`Expected exit 0, got ${result.code}\n${result.stderr}`);
    });

    it('does not create common.po when common is null', () => {
        const commonPo = join(projectDir, 'src/i18n/common.en.po');
        if (existsSync(commonPo)) rmSync(commonPo);
        runNoCommon();
        if (existsSync(commonPo)) throw new Error('common.en.po was created despite common: null');
    });

    it('routes dot-less keys to component namespace when common is null', () => {
        const navbarPo = join(projectDir, 'src/components/NavBar/i18n/NavBar.en.po');
        runNoCommon();
        const keys = getKeys(parsePo(navbarPo));
        if (!keys.includes('CANCEL')) throw new Error('CANCEL not found in NavBar namespace');
    });
}
