import {it} from 'node:test';
/**
 * Tests for t() options parsing:
 * context, plural, interpolation vars, variable options (unresolvable), annotations.
 */
import {join} from 'node:path';
import {writeFileSync} from 'node:fs';
import {projectDir, run, parsePo, compilePo} from '../helpers.js';

const settingsPo = join(projectDir, 'src/components/Settings/i18n/Settings.en.po');

export default function () {
    it('context creates separate msgctxt entry', () => {
        const data = parsePo(settingsPo);
        const verbEntry = data?.translations?.['verb']?.['SETTINGS.SAVE'];
        if (!verbEntry) throw new Error('SETTINGS.SAVE with context verb not found');
        if (verbEntry.msgctxt !== 'verb') throw new Error(`Expected msgctxt verb, got ${verbEntry.msgctxt}`);
    });

    it('multiple contexts create separate entries', () => {
        const data = parsePo(settingsPo);
        const nounEntry = data?.translations?.['noun']?.['SETTINGS.SAVE'];
        if (!nounEntry) throw new Error('SETTINGS.SAVE with context noun not found');
        if (nounEntry.msgctxt !== 'noun') throw new Error(`Expected msgctxt noun, got ${nounEntry.msgctxt}`);
    });

    it('multiple i18n-extract-context markers produce one entry per context', () => {
        const data = parsePo(settingsPo);
        const verbEntry = data?.translations?.['verb']?.['SETTINGS.ACTION'];
        const nounEntry = data?.translations?.['noun']?.['SETTINGS.ACTION'];
        if (!verbEntry) throw new Error('SETTINGS.ACTION with context verb not found');
        if (!nounEntry) throw new Error('SETTINGS.ACTION with context noun not found');
    });

    it('count option marks key as plural with msgid_plural', () => {
        const data = parsePo(settingsPo);
        const entry = data?.translations?.['']?.['SETTINGS.ITEMS_COUNT'];
        if (!entry) throw new Error('SETTINGS.ITEMS_COUNT not found');
        if (!entry.msgid_plural) throw new Error('msgid_plural not set for plural key');
        if (entry.msgid_plural !== 'SETTINGS.ITEMS_COUNT') {
            throw new Error(`Wrong msgid_plural: ${entry.msgid_plural}`);
        }
        if (!Array.isArray(entry.msgstr) || entry.msgstr.length < 2) {
            throw new Error('msgstr not array with 2 entries for plural');
        }
    });

    it('plural key has fuzzy flag when newly detected', () => {
        const data = parsePo(settingsPo);
        const entry = data?.translations?.['']?.['SETTINGS.ITEMS_COUNT'];
        if (!entry?.comments?.flag?.includes('fuzzy')) throw new Error('New plural key missing fuzzy flag');
    });

    it('interpolation vars added as extracted comment hint', () => {
        const data = parsePo(settingsPo);
        const entry = data?.translations?.['']?.['SETTINGS.WELCOME'];
        if (!entry) throw new Error('SETTINGS.WELCOME not found');
        if (!entry.comments?.extracted) throw new Error('No extracted comment for SETTINGS.WELCOME');
        if (!entry.comments.extracted.includes('{{name}}')) throw new Error('{{name}} not in extracted comment');
        if (!entry.comments.extracted.includes('{{date}}')) throw new Error('{{date}} not in extracted comment');
    });

    it('combined context + plural + vars handled correctly', () => {
        const data = parsePo(settingsPo);
        const entry = data?.translations?.['active']?.['SETTINGS.STATUS'];
        if (!entry) throw new Error('SETTINGS.STATUS with context active not found');
        if (!entry.msgid_plural) throw new Error('SETTINGS.STATUS plural not set');
        if (!entry.comments?.extracted?.includes('{{label}}')) {
            throw new Error('{{label}} var not in extracted comment');
        }
    });

    it('warns about variable options objects', () => {
        const result = run();
        const output = result.stdout + result.stderr;
        if (!output.includes('UNRESOLVABLE OPTIONS')) throw new Error('No UNRESOLVABLE OPTIONS warning');
    });

    it('ignore suppresses unresolvable warning on that line', () => {
        const result = run();
        const output = result.stdout + result.stderr;
        // count lines from OptionsTest.ts in unresolvable warning
        // dynamic1 (SETTINGS.SAVE, opts) and dynamic2 (SETTINGS.KEY, getOptions()) warn
        // dynamic3 has ignore and should not appear
        const lines = output.split('\n').filter((l) => l.includes('OptionsTest.ts'));
        // at least one line (dynamic1 or dynamic2) should appear, but not all 3
        if (lines.length === 0) throw new Error('Expected some OptionsTest.ts warnings');
    });

    it('annotations set context and plural for next key', () => {
        const data = parsePo(settingsPo);
        const verbEntry = data?.translations?.['verb']?.['SETTINGS.SAVE'];
        if (!verbEntry) throw new Error('SETTINGS.SAVE verb entry missing after annotations');
        if (!verbEntry.msgid_plural) throw new Error('SETTINGS.SAVE plural not set from i18n-extract-is-plural annotation');
    });

    it('preserves existing msgctxt across runs', () => {
        run();
        const data = parsePo(settingsPo);
        const verbEntry = data?.translations?.['verb']?.['SETTINGS.SAVE'];
        if (!verbEntry) throw new Error('SETTINGS.SAVE verb entry lost on second run');
        if (verbEntry.msgctxt !== 'verb') throw new Error('msgctxt lost on second run');
    });

    it('preserves existing msgid_plural across runs', () => {
        run();
        const data = parsePo(settingsPo);
        const entry = data?.translations?.['']?.['SETTINGS.ITEMS_COUNT'];
        if (!entry?.msgid_plural) throw new Error('msgid_plural lost on second run');
    });

    it('preserves msgid_plural when manually set to custom value', () => {
        const data = parsePo(settingsPo);
        if (data.translations['']['SETTINGS.ITEMS_COUNT']) {
            data.translations['']['SETTINGS.ITEMS_COUNT'].msgid_plural = 'SETTINGS.ITEMS_COUNT_many';
        }
        writeFileSync(settingsPo, compilePo(data));
        run();
        const updated = parsePo(settingsPo);
        const plural = updated?.translations?.['']?.['SETTINGS.ITEMS_COUNT']?.msgid_plural;
        if (plural !== 'SETTINGS.ITEMS_COUNT_many') throw new Error(`Custom msgid_plural lost: ${plural}`);
    });

    it('fuzzy flag preserved across runs', () => {
        const data = parsePo(settingsPo);
        if (data.translations?.['']?.['SETTINGS.ITEMS_COUNT']) {
            data.translations['']['SETTINGS.ITEMS_COUNT'].comments = {
                ...data.translations['']['SETTINGS.ITEMS_COUNT'].comments,
                flag: 'fuzzy',
            };
        }
        writeFileSync(settingsPo, compilePo(data));
        run();
        const updated = parsePo(settingsPo);
        const flag = updated?.translations?.['']?.['SETTINGS.ITEMS_COUNT']?.comments?.flag;
        if (!flag?.includes('fuzzy')) throw new Error(`fuzzy flag lost: ${flag}`);
    });

    it('previous string comment preserved across runs', () => {
        const data = parsePo(settingsPo);
        if (data.translations?.['']?.['SETTINGS.TITLE']) {
            data.translations['']['SETTINGS.TITLE'].comments = {
                ...data.translations['']['SETTINGS.TITLE'].comments,
                previous: 'msgid "Old Settings Title"',
            };
        }
        writeFileSync(settingsPo, compilePo(data));
        run();
        const updated = parsePo(settingsPo);
        const prev = updated?.translations?.['']?.['SETTINGS.TITLE']?.comments?.previous;
        if (!prev?.includes('Old Settings Title')) throw new Error(`previous comment lost: ${prev}`);
    });

    it('inline options context wins over annotation context', () => {
        const data = parsePo(settingsPo);
        const optionsEntry = data?.translations?.['options_context']?.['SETTINGS.OPTIONS_WIN'];
        const markerEntry  = data?.translations?.['marker_context']?.['SETTINGS.OPTIONS_WIN'];
        if (!optionsEntry) throw new Error('SETTINGS.OPTIONS_WIN with options_context not found');
        if (markerEntry) throw new Error('SETTINGS.OPTIONS_WIN with marker_context should not exist — options win');
    });

    it('annotation context + variable options still extracts key with context', () => {
        const data = parsePo(settingsPo);
        const entry = data?.translations?.['verb']?.['SETTINGS.MARKER_VARS'];
        if (!entry) throw new Error('SETTINGS.MARKER_VARS with context verb not found');
        if (!entry.comments?.extracted?.includes('{{var1}}')) {
            throw new Error('vars not in extracted comment for SETTINGS.MARKER_VARS');
        }
    });

    it('i18n-extract-comment and context annotation description both appear in #.', () => {
        const data = parsePo(settingsPo);
        const entry = data?.translations?.['verb']?.['SETTINGS.MIXED_COMMENT'];
        if (!entry) throw new Error('SETTINGS.MIXED_COMMENT with context verb not found');
        const extracted = entry.comments?.extracted ?? '';
        if (!extracted.includes('Keep this very short')) throw new Error('i18n-extract-comment missing from #.');
        if (!extracted.includes('action verb')) throw new Error('context description missing from #.');
    });

    it('i18n-extract-key annotation extracts key with context even when nearby t() call is ignored', () => {
        const data = parsePo(settingsPo);
        const entry = data?.translations?.['verb']?.['SETTINGS.IGNORE_MARKER'];
        if (!entry) throw new Error('SETTINGS.IGNORE_MARKER with context verb not found — annotation key should still extract');
    });
}
