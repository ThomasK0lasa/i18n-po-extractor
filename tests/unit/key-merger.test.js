import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {mergeKeys} from '../../lib/key-merger.js';

/**
 * Build a minimal raw key object for mergeKeys input.
 *
 * @param value key value (msgid)
 * @param ref source reference string like "src/foo.ts:4"
 * @returns raw key object
 */
function makeKey(value, ref) {
    return {value, ref, isDynamic: false, isUnknownNs: false};
}

describe('mergeKeys — source reference sorting', () => {
    it('sorts refs by file path alphabetically then line number numerically', () => {
        const keys = [
            makeKey('HELLO', 'src/beta.ts:12'),
            makeKey('HELLO', 'src/alpha.ts:20'),
            makeKey('HELLO', 'src/alpha.ts:4'),
            makeKey('HELLO', 'src/beta.ts:3'),
        ];

        const merged = mergeKeys(keys);
        const entry = merged.get('HELLO');

        assert.deepStrictEqual(entry.refs, [
            'src/alpha.ts:4',
            'src/alpha.ts:20',
            'src/beta.ts:3',
            'src/beta.ts:12',
        ]);
    });

    it('does not sort line numbers lexicographically', () => {
        const keys = [
            makeKey('KEY', 'file.ts:100'),
            makeKey('KEY', 'file.ts:9'),
            makeKey('KEY', 'file.ts:22'),
        ];

        const merged = mergeKeys(keys);
        const entry = merged.get('KEY');

        assert.deepStrictEqual(entry.refs, [
            'file.ts:9',
            'file.ts:22',
            'file.ts:100',
        ]);
    });

    it('handles extended Latin characters in file paths', () => {
        const keys = [
            makeKey('LABEL', 'src/źródło.ts:1'),
            makeKey('LABEL', 'src/ąlfa.ts:5'),
            makeKey('LABEL', 'src/ćwiczenie.ts:3'),
        ];

        const merged = mergeKeys(keys);
        const entry = merged.get('LABEL');
        const files = entry.refs.map(r => r.slice(0, r.lastIndexOf(':')));

        assert.deepStrictEqual(files, [
            'src/ąlfa.ts',
            'src/ćwiczenie.ts',
            'src/źródło.ts',
        ]);
    });

    it('handles Chinese characters in file paths', () => {
        const keys = [
            makeKey('TITLE', 'src/页面.ts:10'),
            makeKey('TITLE', 'src/组件.ts:2'),
            makeKey('TITLE', 'src/app.ts:1'),
        ];

        const merged = mergeKeys(keys);
        const entry = merged.get('TITLE');

        // ASCII paths sort before CJK, order within CJK is stable
        assert.strictEqual(entry.refs[0], 'src/app.ts:1');
        assert.strictEqual(entry.refs.length, 3);
    });

    it('handles mixed scripts with numeric line sorting', () => {
        const keys = [
            makeKey('MSG', 'src/ścieżka.vue:30'),
            makeKey('MSG', 'src/ścieżka.vue:5'),
            makeKey('MSG', 'src/路径.ts:12'),
            makeKey('MSG', 'src/路径.ts:3'),
            makeKey('MSG', 'src/path.js:7'),
        ];

        const merged = mergeKeys(keys);
        const entry = merged.get('MSG');

        assert.deepStrictEqual(entry.refs, [
            'src/path.js:7',
            'src/ścieżka.vue:5',
            'src/ścieżka.vue:30',
            'src/路径.ts:3',
            'src/路径.ts:12',
        ]);
    });

    it('single ref needs no sorting', () => {
        const keys = [makeKey('SOLO', 'src/only.ts:1')];
        const merged = mergeKeys(keys);

        assert.deepStrictEqual(merged.get('SOLO').refs, ['src/only.ts:1']);
    });
});
