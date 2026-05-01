import {it, after} from 'node:test';
import {scan, getFlagged, hasKey, getOccurrences, getPoPaths} from '../scan-helper.js';
import {getPattern, buildSeparatorRegex} from '../../lib/utils/conventions.js';
import {buildStopRegex, buildMarkerRe} from '../../lib/utils/keys.js';
import {deriveScanVars, collectFiles} from '../../lib/file-collector.js';
import {buildPoMap, resolveNamespaceOverrides} from '../../lib/po-map.js';
import {buildKeyMap} from '../../lib/key-extractor.js';
import {join, dirname} from 'node:path';
import {writeFileSync, mkdirSync, rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpDir = join(__dirname, 'tmp-scan');

function setup(files) {
    rmSync(tmpDir, {recursive: true, force: true});
    for (const [path, content] of Object.entries(files)) {
        const full = join(tmpDir, path);
        mkdirSync(dirname(full), {recursive: true});
        writeFileSync(full, content);
    }
}

function makeConfig(overrides = {}) {
    const keyValidation = {sentenceNameConvention: null, sentenceSeparator: null, behavior: null, ...(overrides.keyValidation ?? {})};
    const base = {
        markers: ['t'],
        namespaceInKey: true,
        namespaceSeparator: '.',
        forbidDynamic: false,
        keyValidation,
        pattern: getPattern(keyValidation.sentenceNameConvention),
        scans: [{
            path: 'src/components',
            namespace: '{firstFolderName}',
            output: '{firstFolderPath}/i18n/{firstFolderName}.{locale}.po',
            extensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'vue'],
            commonOutput: null,
            writeNamespaceHeader: true,
        }],
        ...overrides,
    };
    base.separatorRegex = buildSeparatorRegex(base);
    base.stopRe = buildStopRegex(base.markers);
    base.markerRe = buildMarkerRe(base.markers);
    return base;
}

export default function () {

    it('extracts static keys with single quotes', () => {
        setup({'src/components/NavBar/NavBar.ts': "export const a = t('NAV.HOME');"});
        const keys = scan(makeConfig(), tmpDir);
        if (!hasKey(keys, 'NAV.HOME')) throw new Error('NAV.HOME not extracted');
    });

    it('extracts static keys with double quotes', () => {
        setup({'src/components/NavBar/NavBar.ts': 'export const a = t("NAV.HOME");'});
        const keys = scan(makeConfig(), tmpDir);
        if (!hasKey(keys, 'NAV.HOME')) throw new Error('NAV.HOME not extracted');
    });

    it('extracts static keys with backticks', () => {
        const BT = String.fromCharCode(96);
        setup({'src/components/NavBar/NavBar.ts': `export const a = t(${BT}NAV.HOME${BT});`});
        const keys = scan(makeConfig(), tmpDir);
        if (!hasKey(keys, 'NAV.HOME')) throw new Error('NAV.HOME not extracted');
    });

    it('extracts concatenated key on single line', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('NAV.' + 'HOME');"});
        const keys = scan(makeConfig(), tmpDir);
        if (!hasKey(keys, 'NAV.HOME')) throw new Error('NAV.HOME not extracted from concatenation');
    });

    it('extracts concatenated key spanning two lines', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('NAV.' +\n    'HOME');"});
        const keys = scan(makeConfig(), tmpDir);
        if (!hasKey(keys, 'NAV.HOME')) throw new Error('NAV.HOME not extracted from multiline concatenation');
    });

    it('extracts concatenated key with three parts', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('NAV' + '.' + 'HOME');"});
        const keys = scan(makeConfig(), tmpDir);
        if (!hasKey(keys, 'NAV.HOME')) throw new Error('NAV.HOME not extracted from three-part concatenation');
    });

    it('extracts concatenated key with mixed quotes', () => {
        setup({'src/components/NavBar/NavBar.ts': 'const a = t(\'NAV.\' + "HOME");'});
        const keys = scan(makeConfig(), tmpDir);
        if (!hasKey(keys, 'NAV.HOME')) throw new Error('NAV.HOME not extracted from mixed-quote concatenation');
    });

    it('concatenated key multiline has correct ref', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('NAV.' +\n    'HOME');"});
        const keys = scan(makeConfig(), tmpDir);
        const occ = getOccurrences(keys, 'NAV.HOME')[0];
        if (!occ) throw new Error('NAV.HOME not found');
        if (!occ.ref.includes(':1')) throw new Error(`Expected ref on line 1, got ${occ.ref}`);
    });

    it('single line concatenated key has correct ref', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('NAV.' + 'HOME');"});
        const keys = scan(makeConfig(), tmpDir);
        const occ = getOccurrences(keys, 'NAV.HOME')[0];
        if (!occ) throw new Error('NAV.HOME not found');
        if (!occ.ref.includes(':1')) throw new Error(`Expected ref on line 1, got ${occ.ref}`);
    });

    it('concatenation with dynamic backtick part is flagged dynamic', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('NAV.' + `${x}`);"});
        const keys = scan(makeConfig(), tmpDir);
        const dynamics = getFlagged(keys, 'isDynamic');
        if (dynamics.length === 0) throw new Error('Expected dynamic for concatenation with template literal');
    });

    it('concatenation with dynamic backtick part multiline is flagged dynamic', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('NAV.' +\n    `${x}`);"});
        const keys = scan(makeConfig(), tmpDir);
        const dynamics = getFlagged(keys, 'isDynamic');
        if (dynamics.length === 0) throw new Error('Expected dynamic for multiline concatenation with template literal');
    });

    it('concatenation with variable part is flagged dynamic', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('NAV.' + key);"});
        const keys = scan(makeConfig(), tmpDir);
        const dynamics = getFlagged(keys, 'isDynamic');
        if (dynamics.length === 0) throw new Error('Expected dynamic for concatenation with variable');
    });

    it('concatenation with static backtick part is extracted', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('NAV.' + `HOME`);"});
        const keys = scan(makeConfig(), tmpDir);
        if (!hasKey(keys, 'NAV.HOME')) throw new Error('NAV.HOME not extracted from static backtick concatenation');
    });

    it('does not extract dynamic keys', () => {
        const BT = String.fromCharCode(96);
        setup({'src/components/NavBar/NavBar.ts': `const a = t(${BT}NAV.${BT + '$'}{x}${BT}${BT});`});
        const keys = scan(makeConfig(), tmpDir);
        if (keys.list.some(k => k.value && k.value.includes('${'))) throw new Error('Dynamic key was extracted');
    });

    it('reports dynamic keys with file and line', () => {
        const BT = String.fromCharCode(96);
        setup({'src/components/NavBar/NavBar.ts': `const a = t(${BT}NAV.${'$'}{x}${BT});`});
        const keys = scan(makeConfig(), tmpDir);
        const dynamics = getFlagged(keys, 'isDynamic');
        if (dynamics.length === 0) throw new Error('Dynamic key not reported');
        if (!dynamics[0].ref.includes('NavBar.ts')) throw new Error('Dynamic ref does not include filename');
    });

    it('ignore suppresses dynamic warning inline', () => {
        const BT = String.fromCharCode(96);
        setup({'src/components/NavBar/NavBar.ts': `const a = t(${BT}NAV.${'$'}{x}${BT}); /* i18n-extract-ignore */`});
        const keys = scan(makeConfig(), tmpDir);
        if (getFlagged(keys, 'isDynamic').length > 0) throw new Error('Ignored dynamic key still reported');
    });

    it('ignore suppresses dynamic warning when placed above', () => {
        const BT = String.fromCharCode(96);
        setup({'src/components/NavBar/NavBar.ts': `/* i18n-extract-ignore */\nconst a = t(${BT}NAV.${'$'}{x}${BT});`});
        const keys = scan(makeConfig(), tmpDir);
        if (getFlagged(keys, 'isDynamic').length > 0) throw new Error('Ignored dynamic key still reported');
    });

    it('extracts block comment annotation keys', () => {
        setup({'src/components/NavBar/NavBar.ts': '/* i18n-extract-key NAV.ITEM_A */'});
        const keys = scan(makeConfig(), tmpDir);
        if (!hasKey(keys, 'NAV.ITEM_A')) throw new Error('NAV.ITEM_A not extracted from block comment');
    });

    it('extracts line comment annotation keys', () => {
        setup({'src/components/NavBar/NavBar.ts': '// i18n-extract-key NAV.ITEM_A'});
        const keys = scan(makeConfig(), tmpDir);
        if (!hasKey(keys, 'NAV.ITEM_A')) throw new Error('NAV.ITEM_A not extracted from line comment');
    });

    it('extracts translator comment from source', () => {
        setup({'src/components/NavBar/NavBar.ts': "/* i18n-extract-comment For translators */\nconst a = t('NAV.HOME');"});
        const keys = scan(makeConfig(), tmpDir);
        const occ = getOccurrences(keys, 'NAV.HOME')[0];
        if (!occ?.comments?.includes('For translators')) throw new Error(`Wrong comment: ${occ?.comments}`);
    });

    it('source reference includes file and line number', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('NAV.HOME');"});
        const keys = scan(makeConfig(), tmpDir);
        const occ = getOccurrences(keys, 'NAV.HOME')[0];
        if (!occ?.ref?.includes('NavBar.ts:1')) throw new Error(`Wrong ref: ${occ?.ref}`);
    });

    it('same key used in two files produces two occurrences', () => {
        setup({
            'src/components/NavBar/NavBar.ts': "const a = t('NAV.HOME');",
            'src/components/NavBar/NavBar.html.ts': "const b = t('NAV.HOME');",
        });
        const keys = scan(makeConfig(), tmpDir);
        if (getOccurrences(keys, 'NAV.HOME').length < 2) throw new Error('Expected 2 occurrences for NAV.HOME');
    });

    it('routes dot-less key to common when common configured', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('CANCEL');"});
        const config = makeConfig();
        config.scans[0].commonOutput = 'src/i18n/common.{locale}.po';
        const keys = scan(config, tmpDir);
        const commonPath = getPoPaths(keys).find(p => p.includes('common'));
        if (!commonPath) throw new Error('No common output created');
        if (!keys.byPo.get(commonPath).some(k => k.value === 'CANCEL')) throw new Error('CANCEL not in common');
    });

    it('commonNamespace is null when not set — keys still routed to common po', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('CANCEL');"});
        const config = makeConfig();
        config.scans[0].commonOutput = 'src/i18n/common.{locale}.po';
        config.scans[0].commonNamespace = null;
        const keys = scan(config, tmpDir);
        const commonPath = getPoPaths(keys).find(p => p.includes('common'));
        if (!commonPath) throw new Error('No common entry found');
        if (!keys.byPo.get(commonPath).some(k => k.value === 'CANCEL')) throw new Error('CANCEL not in common path');
    });

    it('commonNamespace uses custom name when set', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('CANCEL');"});
        const config = makeConfig();
        config.scans[0].commonOutput = 'src/i18n/shared.{locale}.po';
        config.scans[0].commonNamespace = 'shared';
        const keys = scan(config, tmpDir);
        const sharedPath = getPoPaths(keys).find(p => p.includes('shared'));
        if (!sharedPath) throw new Error('No shared entry found');
        if (!keys.byPo.get(sharedPath).some(k => k.value === 'CANCEL')) throw new Error('CANCEL not in shared path');
    });

    it('two scans with different commonOutput produce separate common entries', () => {
        setup({
            'src/components/NavBar/NavBar.ts': "const a = t('CANCEL');",
            'src/pages/Home/Home.ts': "const b = t('SAVE');",
        });
        const config = makeConfig();
        config.scans[0].commonOutput = 'src/i18n/common.{locale}.po';
        config.scans.push({
            path: 'src/pages',
            namespace: '{firstFolderName}',
            output: '{firstFolderPath}/i18n/{firstFolderName}.{locale}.po',
            extensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'vue'],
            commonOutput: 'src/i18n/pages-common.{locale}.po',
            writeNamespaceHeader: true,
        });
        const keys = scan(config, tmpDir);
        const commonPaths = getPoPaths(keys).filter(p => p.includes('common'));
        if (commonPaths.length !== 2) throw new Error(`Expected 2 common paths, got ${commonPaths.length}`);
    });

    it('two scans writing same output path collect all keys under same path', () => {
        setup({
            'src/components/NavBar.ts': "const a = t('save');",
            'src/pages/Home.ts': "const b = t('about');",
        });
        const markers = ['t'];
        const config = {
            markers,
            namespaceInKey: false,
            namespaceSeparator: '.',
            forbidDynamic: false,
            keyValidation: {sentenceNameConvention: null, sentenceSeparator: null, behavior: null},
            stopRe: buildStopRegex(markers),
            markerRe: buildMarkerRe(markers),
            scans: [
                {path: 'src/components', namespace: 'translation', output: 'locales/{locale}/translation.po', extensions: ['ts'], commonOutput: null, writeNamespaceHeader: false},
                {path: 'src/pages', namespace: 'translation', output: 'locales/{locale}/translation.po', extensions: ['ts'], commonOutput: null, writeNamespaceHeader: false},
            ],
        };
        const keys = scan(config, tmpDir);
        if (keys.byPo.size !== 1) throw new Error(`Expected 1 po path, got ${keys.byPo.size}`);
        const occs = [...keys.byPo.values()][0];
        if (!occs.some(k => k.value === 'save')) throw new Error('save not in output');
        if (!occs.some(k => k.value === 'about')) throw new Error('about not in output');
    });

    it('reports key format violations', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('nav.settings');"});
        const config = makeConfig({keyValidation: {sentenceNameConvention: 'SCREAMING_SNAKE_CASE', sentenceSeparator: null, behavior: 'warn'}});
        const keys = scan(config, tmpDir);
        const violations = getFlagged(keys, 'hasNamingViolation');
        if (violations.length === 0) throw new Error('Expected violation for nav.settings');
        if (!violations[0].value.includes('nav')) throw new Error('Wrong violation key');
    });

    it('multiple markers — both extracted', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('KEY_T'); const b = ct('KEY_CT');"});
        const config = makeConfig({markers: ['t', 'ct']});
        const keys = scan(config, tmpDir);
        if (!hasKey(keys, 'KEY_T')) throw new Error('KEY_T not extracted');
        if (!hasKey(keys, 'KEY_CT')) throw new Error('KEY_CT not extracted');
    });

    it('method call style i18n.t() extracted correctly', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = i18n.t('KEY_METHOD');"});
        const keys = scan(makeConfig(), tmpDir);
        if (!hasKey(keys, 'KEY_METHOD')) throw new Error('KEY_METHOD from i18n.t() not extracted');
    });

    it('method call this.t() extracted correctly', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = this.t('KEY_THIS');"});
        const keys = scan(makeConfig(), tmpDir);
        if (!hasKey(keys, 'KEY_THIS')) throw new Error('KEY_THIS from this.t() not extracted');
    });

    it('ct annotation does not match word-boundary collision like tct', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = tct('KEY_TCT'); const b = ct('KEY_CT');"});
        const config = makeConfig({markers: ['ct']});
        const keys = scan(config, tmpDir);
        if (hasKey(keys, 'KEY_TCT')) throw new Error('KEY_TCT should not be extracted — tct is not ct');
        if (!hasKey(keys, 'KEY_CT')) throw new Error('KEY_CT from ct() not extracted');
    });

    it('two marker calls on same line both extracted', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('SOME_KEY') + t('OTHER_KEY');"});
        const keys = scan(makeConfig(), tmpDir);
        if (!hasKey(keys, 'SOME_KEY')) throw new Error('SOME_KEY not extracted');
        if (!hasKey(keys, 'OTHER_KEY')) throw new Error('OTHER_KEY not extracted');
    });

    it('t() inside template literal extracted correctly', () => {
        setup({'src/components/NavBar/NavBar.ts': 'const a = `prefix ${t("KEY_TEMPLATE")} suffix`;'});
        const keys = scan(makeConfig(), tmpDir);
        if (!hasKey(keys, 'KEY_TEMPLATE')) throw new Error('KEY_TEMPLATE inside template literal not extracted');
    });

    function scanWithExternal(config) {
        deriveScanVars(config);
        const fileList = collectFiles(config, tmpDir);
        const poMap = buildPoMap(config, fileList);
        resolveNamespaceOverrides(fileList, poMap, tmpDir);
        return buildKeyMap(fileList, poMap, config, tmpDir);
    }

    it('key-level i18n-extract-external suppresses unknown namespace warning', () => {
        setup({'src/components/NavBar/NavBar.ts': "/* i18n-extract-external */\nconst a = t('KEY', {ns: 'ExternalPkg'});"});
        const config = makeConfig();
        const keys = scanWithExternal(config);
        if (getFlagged(keys, 'isUnknownNs').length > 0) throw new Error('Expected no isUnknownNs when annotated external');
        if (!keys.byExternalNamespace.has('ExternalPkg')) throw new Error('ExternalPkg not recorded in byExternalNamespace');
    });

    it('key-level i18n-extract-external inline suppresses unknown namespace warning', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('KEY', {ns: 'ExternalPkg'}); /* i18n-extract-external */"});
        const config = makeConfig();
        const keys = scanWithExternal(config);
        if (getFlagged(keys, 'isUnknownNs').length > 0) throw new Error('Expected no isUnknownNs for inline external annotation');
        if (!keys.byExternalNamespace.has('ExternalPkg')) throw new Error('ExternalPkg not recorded in byExternalNamespace');
    });

    it('key-level i18n-extract-external records ref count correctly', () => {
        setup({'src/components/NavBar/NavBar.ts': [
            "/* i18n-extract-external */",
            "const a = t('KEY_A', {ns: 'ExternalPkg'});",
            "/* i18n-extract-external */",
            "const b = t('KEY_B', {ns: 'ExternalPkg'});",
        ].join('\n')});
        const config = makeConfig();
        const keys = scanWithExternal(config);
        if (keys.byExternalNamespace.get('ExternalPkg')?.size !== 2) {
            throw new Error(`Expected 2 external refs, got ${keys.byExternalNamespace.get('ExternalPkg')?.size}`);
        }
    });

    it('non-external key with unknown ns still reports isUnknownNs without annotation', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('KEY', {ns: 'ExternalPkg'});"});
        const config = makeConfig();
        const keys = scanWithExternal(config);
        if (getFlagged(keys, 'isUnknownNs').length === 0) throw new Error('Expected isUnknownNs without external annotation');
        if (keys.byExternalNamespace.has('ExternalPkg')) throw new Error('ExternalPkg should not be in byExternalNamespace without annotation');
    });


    it('t() inside an object literal does not produce false hasDynamicOptions', () => {
        setup({'src/components/NavBar/NavBar.ts': [
            "const tabs = [",
            "    {id: 'a', label: t('NAV.HOME'), icon: '\u{1F3E0}'},",
            "    {id: 'b', label: t('NAV.ABOUT'), icon: '\u{1F4D6}'},",
            "];",
        ].join('\n')});
        const keys = scan(makeConfig(), tmpDir);
        if (getFlagged(keys, 'hasDynamicOptions').length > 0) {
            throw new Error('t() inside object literal incorrectly flagged as hasDynamicOptions');
        }
        if (!hasKey(keys, 'NAV.HOME')) throw new Error('NAV.HOME not extracted');
        if (!hasKey(keys, 'NAV.ABOUT')) throw new Error('NAV.ABOUT not extracted');
    });

    it('t() as object property followed by more properties does not produce false hasDynamicOptions', () => {
        setup({'src/components/NavBar/NavBar.ts': [
            "const obj = {",
            "    label: t('NAV.HOME'),",
            "    other: 'value',",
            "};",
        ].join('\n')});
        const keys = scan(makeConfig(), tmpDir);
        if (getFlagged(keys, 'hasDynamicOptions').length > 0) {
            throw new Error('t() as object property incorrectly flagged as hasDynamicOptions');
        }
        if (!hasKey(keys, 'NAV.HOME')) throw new Error('NAV.HOME not extracted');
    });

    it('t() with real options object still extracts options correctly after fix', () => {
        setup({'src/components/NavBar/NavBar.ts': "const a = t('NAV.HOME', {count: n});"});
        const keys = scan(makeConfig(), tmpDir);
        if (!hasKey(keys, 'NAV.HOME')) throw new Error('NAV.HOME not extracted');
        const occ = keys.list.find((k) => k.value === 'NAV.HOME');
        if (!occ.isPlural) throw new Error('Expected isPlural from count option');
    });

    after(() => rmSync(tmpDir, {recursive: true, force: true}));
}
    // appended below existing last test — do not remove the closing brace above
