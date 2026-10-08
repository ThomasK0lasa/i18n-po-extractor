import {readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync} from 'node:fs';
import {dirname} from 'node:path';
import gettextParser from 'gettext-parser';
import {resolvePlaceholders} from './utils/files.js';
import {mergeKeys} from './key-merger.js';
import {getZeroStats, addToStats, reportFile} from './report.js';

const {po: poParser} = gettextParser;

/**
 * Write all output files and report per-file results.
 *
 * :param keysMap: keys object from buildKeyMap
 * :param poMap: Map from buildPoMap
 * :param config: validated config object
 * :returns: write stats object
 */
export function writeAndReport(keysMap, poMap, config) {
    const s = getZeroStats();

    if (config.dryRun) console.log('\n  DRY RUN — no files will be written\n');

    for (const [outputPath, keys] of keysMap.byPo) {
        const mergedKeys = mergeKeys(keys);
        if (mergedKeys.size === 0) continue;

        const po = poMap.get(outputPath);
        const results = writePerLocale(po, mergedKeys, config);

        for (const result of results) {
            addToStats(s, result.stats, result.isNew, result.isStale);
            if (!result.isStale) reportFile(result, config);
        }
    }

    s.orphaned = collectOrphans(config, poMap);
    return s;
}

/**
 * Write .po files for all locales to the resolved output path.
 *
 * :param po: po map entry { outputPath, namespaceName, _writtenPaths }
 * :param keys: Map from mergeKeys
 * :param config: validated config object
 * :returns: array of result objects per locale
 */
export function writePerLocale(po, keys, config) {
    po._writtenPaths = new Set();
    const results = [];
    for (const locale of config.locales) buildAndWritePo(po, locale, keys, results, config);
    return results;
}

/**
 * Build, write, and record stats for a single .po file.
 *
 * :param po: po map entry { outputPath, namespaceName, _writtenPaths }
 * :param locale: locale code e.g. 'en'
 * :param keys: Map from mergeKeys
 * :param results: array to push the result object onto
 * :param config: validated config object
 */
function buildAndWritePo(po, locale, keys, results, config) {
    const poPath = resolvePlaceholders(po.outputPath, {locale});
    po._writtenPaths.add(poPath);
    const existing = existsSync(poPath) ? poParser.parse(readFileSync(poPath)) : null;
    const existingByContext = existing?.translations ?? {};
    const existingObsolete = existing?.obsolete?.[''] ?? {};
    const existingHeaders = existing?.headers ?? {};

    const {translationsByContext, translationStats} = buildTranslations(keys, existingByContext, existingObsolete);
    const {obsolete, obsoleteCount} = buildObsolete(keys, existingByContext, existingObsolete);
    const headers = buildHeaders(po.namespaceName, locale, existingHeaders);
    const poData = buildPoData(translationsByContext, headers, obsolete, existingByContext);

    const compiled = poParser.compile(poData);
    const existingRaw = existsSync(poPath) ? readFileSync(poPath) : null;
    const isStale = !!(existingRaw && compiled.equals(existingRaw));

    if (!isStale && !config.dryRun) {
        mkdirSync(dirname(poPath), {recursive: true});
        writeFileSync(poPath, compiled);
    }

    const totalCount = Object.values(translationsByContext)
        .flatMap((ctx) => Object.keys(ctx))
        .filter((k) => k !== '').length;

    const stats = {
        ...translationStats,
        obsoleteCount,
        fileObsolete: Object.keys(obsolete).length,
        totalCount,
    };

    results.push({
        poPath,
        isNew: !existing,
        isStale,
        stats,
    });
}

/**
 * Build the translations object from extracted keys and existing entries.
 *
 * :param keys: Map from mergeKeys
 * :param existingByContext: existing translations grouped by context
 * :param existingObsolete: existing obsolete entries
 * :returns: { translationsByContext, translationStats }
 */
function buildTranslations(keys, existingByContext, existingObsolete) {
    const translationsByContext = {};
    let newCount = 0;
    let pluralCount = 0;
    let contextCount = 0;
    let fuzzyCount = 0;

    for (const [, key] of [...keys.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const fromTranslations = existingByContext[key.context]?.[key.value];
        const fromObsolete = existingObsolete[key.value];
        const isRestored = !fromTranslations && !!fromObsolete;

        if (!fromTranslations) newCount++;

        const existing_entry = fromTranslations ?? fromObsolete ?? null;
        const entry = buildEntry(key, existing_entry, isRestored);

        if (entry.msgid_plural) pluralCount++;
        if (key.context) contextCount++;
        if (entry.comments?.flag?.includes('fuzzy')) fuzzyCount++;

        if (!translationsByContext[key.context]) translationsByContext[key.context] = {};
        translationsByContext[key.context][key.value] = entry;
    }

    const translationStats = {newCount, pluralCount, contextCount, fuzzyCount};

    return {translationsByContext, translationStats};
}

/**
 * Build the obsolete section from keys no longer in source.
 * Does not mutate existingObsolete — builds a fresh obsolete map.
 * obsoleteCount reflects only keys newly moved to obsolete this run.
 *
 * :param keys: Map from mergeKeys
 * :param existingByContext: existing translations grouped by context
 * :param existingObsolete: existing obsolete entries
 * :returns: { obsolete, obsoleteCount }
 */
function buildObsolete(keys, existingByContext, existingObsolete) {
    const activeKeys = new Set([...keys.values()].map((k) => k.value));
    const obsolete = {};
    let obsoleteCount = 0;

    // Carry forward already-obsolete entries that are still not active
    for (const [key, entry] of Object.entries(existingObsolete)) {
        if (!activeKeys.has(key)) obsolete[key] = {msgid: key, msgstr: entry.msgstr};
    }

    // Move newly-stale active entries to obsolete and count them
    for (const [, entries] of Object.entries(existingByContext)) {
        for (const [key, entry] of Object.entries(entries)) {
            if (key === '' || activeKeys.has(key)) continue;
            if (!obsolete[key]) {
                obsolete[key] = {msgid: key, msgstr: entry.msgstr};
                obsoleteCount++;
            }
        }
    }

    return {obsolete, obsoleteCount};
}

/**
 * Build the headers object for the .po file.
 *
 * :param namespaceName: namespace string or null
 * :param locale: locale code
 * :param existingHeaders: headers from existing .po file
 * :returns: headers object
 */
function buildHeaders(namespaceName, locale, existingHeaders) {
    const headers = {
        ...existingHeaders,
        'Language': locale,
        'Content-Type': 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding': '8bit',
    };
    if (namespaceName) headers['X-Namespace'] = namespaceName;
    return headers;
}

/**
 * Assemble the final poData object for gettext-parser compilation.
 *
 * :param translationsByContext: built by buildTranslations
 * :param headers: built by buildHeaders
 * :param obsolete: built by buildObsolete
 * :param existingByContext: existing translations for header entry preservation
 * :returns: poData object
 */
function buildPoData(translationsByContext, headers, obsolete, existingByContext) {
    const existingHeaderEntry = existingByContext['']?.[''];

    if (!translationsByContext['']) translationsByContext[''] = {};
    translationsByContext[''][''] = {
        msgid: '',
        msgstr: [''],
        comments: existingHeaderEntry?.comments,
    };

    return {
        charset: 'utf-8',
        headers,
        translations: translationsByContext,
        obsolete: {'': obsolete},
    };
}

/**
 * Build a single translation entry from extracted key metadata and existing entry.
 *
 * :param key: merged key object { value, context, refs, comment, isPlural } from mergeKeys
 * :param existing_entry: existing gettext-parser entry or null
 * :param isRestored: true if key was in obsolete and is being restored
 * :returns: gettext-parser translation entry object
 */
function buildEntry(key, existing_entry, isRestored) {
    const existingComments = existing_entry?.comments ?? {};

    const mergedComments = {
        translator: existingComments.translator,
        reference:  key.refs.join('\n'),
        extracted:  key.comment ?? existingComments.extracted,
        flag:       existingComments.flag,
        previous:   existingComments.previous,
    };

    const wasPlural = !!existing_entry?.msgid_plural;
    const becomesPlural = key.isPlural && !wasPlural;
    if (isRestored || becomesPlural) {
        const existingFlags = existingComments.flag ?? '';
        if (!existingFlags.includes('fuzzy')) {
            mergedComments.flag = existingFlags ? `fuzzy, ${existingFlags}` : 'fuzzy';
        }
    }

    const entry = {
        msgid: key.value,
        msgstr: existing_entry?.msgstr ?? [''],
        comments: mergedComments,
    };

    if (key.context) entry.msgctxt = key.context;
    else if (existing_entry?.msgctxt) entry.msgctxt = existing_entry.msgctxt;

    if (existing_entry?.msgid_plural) {
        entry.msgid_plural = existing_entry.msgid_plural;
        if (!Array.isArray(entry.msgstr) || entry.msgstr.length < 2) entry.msgstr = ['', ''];
    } else if (key.isPlural) {
        entry.msgid_plural = key.value;
        entry.msgstr = ['', ''];
    }

    return entry;
}

/**
 * Collect .po files on disk that were not written in this run.
 * Recursively scans each scan path for all .po files.
 *
 * :param config: validated config object
 * :param poMap: Map from buildPoMap, entries have _writtenPaths Set
 * :returns: string[] of orphaned .po file paths
 */
function collectOrphans(config, poMap) {
    const writtenPaths = new Set([...poMap.values()].flatMap((po) => [...(po._writtenPaths ?? [])]));
    const scannedRoots = new Set();
    const orphaned = [];

    for (const scan of config.scans) {
        if (!scannedRoots.has(scan.path)) {
            scannedRoots.add(scan.path);
            collectPoFiles(scan.path, writtenPaths, orphaned);
        }
    }

    for (const poPath of writtenPaths) {
        const dir = dirname(poPath);
        if (!scannedRoots.has(dir)) {
            scannedRoots.add(dir);
            collectPoFiles(dir, writtenPaths, orphaned);
        }
    }

    return orphaned;
}

/**
 * Recursively collect .po files under a directory that are not in writtenPaths.
 *
 * :param dir: directory to scan
 * :param writtenPaths: Set of resolved paths written this run
 * :param orphaned: array to push orphaned paths onto
 */
function collectPoFiles(dir, writtenPaths, orphaned) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
        const fullPath = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
            collectPoFiles(fullPath, writtenPaths, orphaned);
        } else if (entry.name.endsWith('.po') && !writtenPaths.has(fullPath)) {
            orphaned.push(fullPath);
        }
    }
}
