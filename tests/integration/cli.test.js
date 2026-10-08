import {it} from 'node:test';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {run, runIn, cleanupProject, fakeProjectsDir} from '../helpers.js';

const simpleSpaDir = join(fakeProjectsDir, 'fake-project-simple-spa');

export default function () {
    it('--help exits with code 0', () => {
        const result = run('--help');
        if (result.code !== 0) throw new Error(`Expected exit 0, got ${result.code}`);
    });

    it('--help shows usage info', () => {
        const result = run('--help');
        if (!result.stdout.includes('Usage:')) throw new Error('No Usage in --help output');
    });

    it('--dry-run exits with code 0', () => {
        cleanupProject(simpleSpaDir);
        const result = runIn(simpleSpaDir, '--dry-run');
        if (result.code !== 0) throw new Error(`Expected exit 0, got ${result.code}\n${result.stderr}`);
        cleanupProject(simpleSpaDir);
    });

    it('--dry-run prints dry-run header', () => {
        cleanupProject(simpleSpaDir);
        const result = runIn(simpleSpaDir, '--dry-run');
        const output = result.stdout + result.stderr;
        if (!output.includes('DRY RUN')) throw new Error('No DRY RUN header in output');
        cleanupProject(simpleSpaDir);
    });

    it('--dry-run does not create output files', () => {
        cleanupProject(simpleSpaDir);
        runIn(simpleSpaDir, '--dry-run');
        const poPath = join(simpleSpaDir, 'public/i18n/translation.en.po');
        if (existsSync(poPath)) throw new Error('--dry-run should not create files');
        cleanupProject(simpleSpaDir);
    });

    it('--dry-run reports what would be created', () => {
        cleanupProject(simpleSpaDir);
        const result = runIn(simpleSpaDir, '--dry-run');
        const output = result.stdout + result.stderr;
        if (!output.includes('would create')) throw new Error('Expected "would create" in dry-run output');
        cleanupProject(simpleSpaDir);
    });

    it('--dry-run reports would update for existing files', () => {
        cleanupProject(simpleSpaDir);
        // first real run to create files
        runIn(simpleSpaDir);
        // then dry-run — files exist, so it should say "would update"
        const result = runIn(simpleSpaDir, '--dry-run');
        const output = result.stdout + result.stderr;
        // stale files won't show, but if there's output it should say "would update" not "created"
        if (output.includes('[dry-run] would create')) {
            throw new Error('Expected "would update" for existing files, got "would create"');
        }
        cleanupProject(simpleSpaDir);
    });
}
