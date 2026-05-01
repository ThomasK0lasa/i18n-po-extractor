import {it} from 'node:test';
import {join} from 'node:path';
import {projectDir, parsePo, getKeys} from '../helpers.js';

const commonPo = join(projectDir, 'src/i18n/common.en.po');

export default function () {
    it('routes dot-less keys to common', () => {
        const keys = getKeys(parsePo(commonPo));
        if (!keys.includes('CANCEL')) throw new Error('CANCEL not in common');
        if (!keys.includes('SAVE')) throw new Error('SAVE not in common');
    });

    it('dot keys do not appear in common', () => {
        const keys = getKeys(parsePo(commonPo));
        if (keys.some((k) => k.includes('.'))) throw new Error('Dot keys found in common');
    });
}

import {writeFileSync, mkdirSync, rmSync, existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {bin, fakeProjectsDir} from '../helpers.js';

const customCommonDir = join(fakeProjectsDir, 'fake-project-custom-1');
