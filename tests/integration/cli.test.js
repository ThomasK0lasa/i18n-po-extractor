import {it} from 'node:test';
import {run} from '../helpers.js';

export default function () {
    it('--help exits with code 0', () => {
        const result = run('--help');
        if (result.code !== 0) throw new Error(`Expected exit 0, got ${result.code}`);
    });

    it('--help shows usage info', () => {
        const result = run('--help');
        if (!result.stdout.includes('Usage:')) throw new Error('No Usage in --help output');
    });
}
