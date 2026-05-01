import {it} from 'node:test';
import {join} from 'node:path';
import {writeFileSync, mkdirSync, rmSync} from 'node:fs';
import {fakeProjectsDir, runWithConfig, cleanupProject} from '../helpers.js';

const reactDir = join(fakeProjectsDir, 'fake-project-react');

export default function () {
    it('detects orphaned .po files in subdirectory after component rename', () => {
        // First run — generate NavBar.en.po
        runWithConfig(reactDir, 'i18n-po-extractor.json');

        // Simulate rename: manually create an "old" .po file that won't be written next run
        const orphanPath = join(reactDir, 'locales/en/OldComponent.po');
        mkdirSync(join(reactDir, 'locales/en'), {recursive: true});
        writeFileSync(orphanPath, 'msgid ""\nmsgstr ""\n\nmsgid "test"\nmsgstr ""\n');

        // Second run — OldComponent.po should be detected as orphan
        const result = runWithConfig(reactDir, 'i18n-po-extractor.json');
        const output = result.stdout + result.stderr;

        if (!output.includes('ORPHANED FILES')) throw new Error('No ORPHANED FILES warning in output');
        if (!output.includes('OldComponent.po')) throw new Error('OldComponent.po not mentioned in orphan warning');

        cleanupProject(reactDir);
    });
}
