import {mergeKeys} from './key-merger.js';

const ALL_REPORT_CATEGORIES = ['added', 'restored', 'obsoleted'];

/**
 * Console reporting for i18n-po-extractor.
 * All output functions are pure — they just print and return nothing.
 */

/**
 * Parse the --report flag from CLI args.
 * Returns null if --report is not present, or an array of category names.
 *
 * @param args string[] CLI args
 * @returns string[]|null category names to report, or null if --report not set
 */
export function parseReportFlag(args) {
    const idx = args.indexOf('--report');
    if (idx === -1) return null;

    const next = args[idx + 1];
    if (!next || next.startsWith('--')) return ALL_REPORT_CATEGORIES;

    const requested = next.split(',').map((c) => c.trim().toLowerCase());
    const valid = requested.filter((c) => ALL_REPORT_CATEGORIES.includes(c));
    if (valid.length === 0) {
        console.error(`  Unknown --report categories: ${next}`);
        console.error(`  Available: ${ALL_REPORT_CATEGORIES.join(', ')}`);
        process.exit(1);
    }
    return valid;
}

/**
 * Return a zeroed stats object for accumulating write results.
 *
 * @returns stats object with all counters set to 0
 */
export function getZeroStats() {
    return {
        created: 0,
        updated: 0,
        stale: 0,
        totalNew: 0,
        totalWithdrawn: 0,
        grandTotal: 0,
        totalFuzzy: 0,
        totalObsolete: 0,
        totalPlural: 0,
        totalContext: 0,
    };
}

/**
 * Accumulate a single writeOutput result into the stats object.
 *
 * @param s stats object from getZeroStats
 * @param result result object from writeOutput
 */
export function addToStats(s, stats, isNew, isStale) {
    s.grandTotal     += stats.totalCount;
    s.totalPlural    += stats.pluralCount;
    s.totalContext   += stats.contextCount;
    if (isStale) {
        s.stale++;
        return;
    }
    s.totalNew       += stats.newCount;
    s.totalWithdrawn += stats.obsoleteCount;
    s.totalFuzzy     += stats.fuzzyCount;
    s.totalObsolete  += stats.fileObsolete;
    isNew ? s.created++ : s.updated++;
}

/**
 * Report a processed .po file with stats.
 *
 * @param result result object from writeOutput
 * @param config validated config object
 */
export function reportFile(result, config = {}) {
    const dryRun = !!config.dryRun;
    const {stats: s} = result;
    const changes = [];
    if (s.newCount > 0) changes.push(`+${s.newCount} added`);
    if (s.obsoleteCount > 0) changes.push(`-${s.obsoleteCount} withdrawn`);
    const changesStr = changes.length ? `(${changes.join(', ')}) ` : '';

    const statParts = [`${s.totalCount} total`];
    if (s.fuzzyCount > 0) statParts.push(`${s.fuzzyCount} fuzzy`);
    if (s.fileObsolete > 0) statParts.push(`${s.fileObsolete} obsolete`);
    if (s.pluralCount > 0) statParts.push(`${s.pluralCount} plural`);
    if (s.contextCount > 0) statParts.push(`${s.contextCount} context`);

    const action = result.isNew ? 'created' : 'updated';
    const prefix = dryRun ? `[dry-run] would ${action === 'created' ? 'create' : 'update'}` : action;
    console.log(`  ${prefix}  ${result.poPath}  ${changesStr}${statParts.join(', ')}`);
}

/**
 * Report all warnings and final summary.
 *
 * @param keys keys object from buildKeyMap
 * @param s write stats from writeAndReport
 * @param config validated config object
 */
export function reportWarningsAndSummary(keys, s, config) {
    const dynamics = [];
    const dynamicOptions = [];
    const unknownNs = [];
    const namingViolations = [];

    for (const key of keys.list) {
        if (key.isDynamic) dynamics.push(key.ref);
        if (key.hasDynamicOptions) dynamicOptions.push(key.ref);
        if (key.isUnknownNs) unknownNs.push(`${key.ref} (ns=${key.nsOverride})`);
        if (key.hasNamingViolation) namingViolations.push(key);
    }

    reportDynamicWarnings(dynamics, config);
    reportUnresolvable(dynamicOptions);
    reportUnknownNs(unknownNs);
    reportNamingViolations(namingViolations, config);
    reportExternalNamespaces(keys.byExternalNamespace);
    reportOrphans(s.orphaned);

    const localeCount = config.locales.length;

    s.warnings      = countWarnings(dynamics, dynamicOptions, unknownNs, namingViolations, s.orphaned, config);
    s.totalExternal = countExternal(keys.byExternalNamespace);
    s.grandTotal    = Math.round(s.grandTotal / localeCount);
    s.totalPlural   = Math.round(s.totalPlural / localeCount);
    s.totalContext  = Math.round(s.totalContext / localeCount);
    s.totalDynamic  = dynamics.length;
    reportSummary(s);
}

/**
 * Count total warnings for the summary line.
 *
 * @param dynamics dynamic key refs
 * @param dynamicOptions dynamic options refs
 * @param unknownNs unknown namespace refs
 * @param namingViolations naming violation key objects
 * @param orphaned orphaned file paths
 * @param config validated config object
 * @returns total warning count
 */
function countWarnings(dynamics, dynamicOptions, unknownNs, namingViolations, orphaned, config) {
    const violationCount = namingViolations.length && config.keyValidation.behavior ? namingViolations.length : 0;
    return dynamics.length + dynamicOptions.length + unknownNs.length + violationCount + orphaned.length;
}

/**
 * Count total externally-skipped keys across all namespaces.
 *
 * @param byExternalNamespace Map<nsName, Set<ref>> from buildKeyMap
 * @returns total external key count
 */
function countExternal(byExternalNamespace) {
    return [...byExternalNamespace.values()].reduce((sum, refs) => sum + refs.size, 0);
}

/**
 * Report namespace override mismatches after pass 1.
 *
 * @param overrideMismatches Array of { filePath, overrideName }
 * @param config validated config object
 */
export function reportNamespaceMismatches(overrideMismatches, config) {
    const behavior = config.namespaceValidationBehavior;
    if (!behavior || overrideMismatches.length === 0) return;
    const prefix = behavior === 'error' ? '✗' : '⚠';
    console.warn(`\n  ${prefix} NAMESPACE OVERRIDE MISMATCH — override not found in any registered po file:`);
    for (const {filePath, overrideName} of overrideMismatches) {
        console.warn(`    ${filePath} (namespace: ${overrideName})`);
    }
    if (behavior === 'error') process.exit(1);
}

/**
 * Report dynamic key warnings or errors.
 *
 * @param dynamics array of 'file.ts:line' strings
 * @param config validated config object
 */
export function reportDynamicWarnings(dynamics, config) {
    if (dynamics.length === 0) return;
    const label = config.forbidDynamic ? 'DYNAMIC KEYS (forbidden)' : 'DYNAMIC KEYS';
    const log = config.forbidDynamic ? console.error : console.warn;
    log(`\n  ${label} — cannot be extracted automatically, use /* i18n-extract-key KEY */ comments:`);
    for (const loc of dynamics) {
        log(`    ${loc}`);
    }
}

/**
 * Report unresolvable options warnings — t() called with a variable options object.
 *
 * @param dynamicOptions array of 'file.ts:line' strings
 */
export function reportUnresolvable(dynamicOptions) {
    if (dynamicOptions.length === 0) return;
    console.warn(`\n  UNRESOLVABLE OPTIONS — t() called with variable options object, use annotations to declare:`);
    console.warn(`    /* i18n-extract-context CONTEXT */`);
    console.warn(`    /* i18n-extract-is-plural */`);
    console.warn(`    /* i18n-extract-ns NAMESPACE */`);
    console.warn(`    /* i18n-extract-var VAR - description */`);
    for (const loc of dynamicOptions) {
        console.warn(`    ${loc}`);
    }
}

/**
 * Report unknown namespace warnings — ns: value not found in any configured scan.
 *
 * @param unknownNs array of 'file.ts:line (ns=name)' strings
 */
export function reportUnknownNs(unknownNs) {
    if (unknownNs.length === 0) return;
    console.warn(`\n  UNKNOWN NAMESPACE — ns: value not found in any configured scan, key skipped:`);
    for (const loc of unknownNs) {
        console.warn(`    ${loc}`);
    }
}

/**
 * Report key naming violation warnings or errors.
 *
 * @param namingViolations array of key objects
 * @param config validated config object
 */
export function reportNamingViolations(namingViolations, config) {
    const {behavior, sentenceNameConvention} = config.keyValidation;
    if (namingViolations.length === 0 || !behavior) return;
    const log = behavior === 'error' ? console.error : console.warn;
    const prefix = behavior === 'error' ? '✗' : '⚠';
    log(`\n  ${prefix} KEY FORMAT violations (${sentenceNameConvention}):`);
    for (const {value, ref} of namingViolations) {
        log(`    ${value.padEnd(40)} ${ref}`);
    }
}

/**
 * Report external namespace references.
 *
 * @param byExternalNamespace Map<nsName, Set<ref>> from buildKeyMap
 */
export function reportExternalNamespaces(byExternalNamespace) {
    if (byExternalNamespace.size === 0) return;
    console.log(`\n  EXTERNAL NAMESPACE — keys skipped (referenced from external packages):`);
    for (const [nsName, refs] of byExternalNamespace) {
        const files = [...new Set([...refs].map((r) => r.split(':')[0]))];
        console.log(`    ${nsName}: ${refs.size} key${refs.size === 1 ? '' : 's'} (${files.join(', ')})`);
    }
}

/**
 * Print final summary.
 *
 * @param s stats object from writeAndReport, mutated by reportWarningsAndSummary
 */
export function reportSummary(s) {
    const fileParts = [];
    if (s.created > 0) fileParts.push(`${s.created} created`);
    if (s.updated > 0) fileParts.push(`${s.updated} updated`);
    if (s.stale > 0) fileParts.push(`${s.stale} stale`);
    if (s.warnings > 0) fileParts.push(`${s.warnings} warnings`);

    const keyParts = [`${s.grandTotal} total`];
    if (s.totalPlural > 0) keyParts.push(`${s.totalPlural} plural`);
    if (s.totalContext > 0) keyParts.push(`${s.totalContext} context`);
    if (s.totalDynamic > 0) keyParts.push(`${s.totalDynamic} dynamic`);
    if (s.totalExternal > 0) keyParts.push(`${s.totalExternal} external`);
    if (s.totalObsolete > 0) keyParts.push(`${s.totalObsolete} obsolete`);
    if (s.totalFuzzy > 0) keyParts.push(`${s.totalFuzzy} fuzzy`);

    const changeParts = [];
    if (s.totalNew > 0) changeParts.push(`+${s.totalNew} added`);
    if (s.totalWithdrawn > 0) changeParts.push(`-${s.totalWithdrawn} withdrawn`);

    console.log(`\nDone.`);
    console.log(`Files:   ${fileParts.join(', ')}`);
    console.log(`Keys:    ${keyParts.join(', ')}`);
    if (changeParts.length > 0) console.log(`Changes: ${changeParts.join(', ')}`);
}

/**
 * Print a post-run report of changed keys, grouped by category.
 * Language-agnostic by default — keys common to all locales are printed once.
 * Keys that changed in only some locales get a locale annotation.
 *
 * @param changesByLocale { locale: { added: Set, restored: Set, obsoleted: Set } }
 * @param categories string[] categories to show, e.g. ['added', 'restored', 'obsoleted']
 */
export function reportChanges(changesByLocale, categories) {
    const locales = Object.keys(changesByLocale);
    if (locales.length === 0) return;

    const grouped = groupChangesByCategory(changesByLocale, locales);
    let hasOutput = false;

    for (const category of categories) {
        const entries = grouped[category];
        if (!entries || entries.length === 0) continue;

        if (!hasOutput) {
            console.log('\n  Report:');
            hasOutput = true;
        }
        console.log(`    ${category}:`);
        for (const {key, annotation} of entries) {
            const suffix = annotation ? `  (${annotation})` : '';
            console.log(`      ${key}${suffix}`);
        }
    }
}

/**
 * Group per-locale changes into a single structure with locale annotations.
 * Keys present in all locales have no annotation. Keys present in a subset
 * get an annotation listing those locales.
 *
 * @param changesByLocale { locale: { added: Set, restored: Set, obsoleted: Set } }
 * @param locales string[] all locale codes
 * @returns { added: [{key, annotation}], restored: [...], obsoleted: [...] }
 */
function groupChangesByCategory(changesByLocale, locales) {
    const allCategories = ['added', 'restored', 'obsoleted'];
    const grouped = {};

    for (const category of allCategories) {
        const keyLocales = new Map();

        for (const locale of locales) {
            const keys = changesByLocale[locale]?.[category];
            if (!keys) continue;
            for (const key of keys) {
                if (!keyLocales.has(key)) keyLocales.set(key, []);
                keyLocales.get(key).push(locale);
            }
        }

        const entries = [];
        for (const [key, presentIn] of [...keyLocales.entries()].sort(([a], [b]) => a.localeCompare(b))) {
            const annotation = presentIn.length < locales.length ? presentIn.join(', ') : null;
            entries.push({key, annotation});
        }
        grouped[category] = entries;
    }

    return grouped;
}

/**
 * Report orphaned .po files that exist on disk but were not written in this run.
 *
 * @param orphaned string[] of orphaned file paths
 */
export function reportOrphans(orphaned) {
    if (orphaned.length === 0) return;
    console.warn(`\n  ORPHANED FILES — not written this run, possibly left from a rename or restructure:`);
    console.warn(`  Rename or delete them manually, then re-run extraction.`);
    for (const path of orphaned) {
        console.warn(`    ${path}`);
    }
}

/**
 * Report common usage warnings detected during key rerouting analysis.
 *
 * @param warnings array of { type, scan, keys } objects
 *   type 'duplicates'  — static/no namespace, duplicate keys across files, no commonOutput
 *   type 'unseparated' — namespaceInKey true, keys without separator, no commonOutput
 */
export function reportCommonUsageWarnings(warnings) {
    if (warnings.length === 0) return;
    console.warn(`\n  COMMON USAGE — keys that may benefit from commonOutput:`);
    for (const w of warnings) {
        if (w.type === 'duplicates') {
            console.warn(`    scan "${w.scan}" — ${w.keys.length} key(s) duplicated across multiple files: ${w.keys.join(', ')}`);
            console.warn(`      Add commonOutput to automatically route shared keys to a single file.`);
        } else if (w.type === 'unseparated') {
            console.warn(`    scan "${w.scan}" — ${w.keys.length} key(s) lack the namespace separator: ${w.keys.join(', ')}`);
            console.warn(`      Add commonOutput to capture shared keys, or ensure all keys are namespaced.`);
        }
    }
    console.warn(`  If this behavior is intentional and you don't want to see this warning again, set commonUsageValidation to null.`);
}
