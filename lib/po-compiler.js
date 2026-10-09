/**
 * Compile .po files to consumable formats (JSON, JS, MO).
 *
 * Reads written .po paths from the po map entries, converts each
 * through gettext-converter (json/js) or gettext-parser (mo),
 * and writes the output alongside or to a configured compileOutput path.
 */

import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {dirname} from 'node:path';
import gettextParser from 'gettext-parser';
import po2i18next from 'gettext-converter/po2i18next';
import {resolvePlaceholders} from './utils/files.js';

const FORMAT_EXTENSIONS = {json: '.json', js: '.js', mo: '.mo'};

/**
 * Compile all written .po files according to config.compile settings.
 *
 * @param poMap Map from buildPoMap — entries carry _writtenPaths
 * @param config validated config object (must have config.compile set)
 * @returns {{ compiled: number, skipped: number }}
 */
export function compilePoFiles(poMap, config) {
    const {compile} = config;
    const stats = {compiled: 0, skipped: 0};

    if (config.dryRun) {
        console.log('\n  DRY RUN — no compiled files will be written\n');
    }

    for (const po of poMap.values()) {
        if (!po._writtenPaths || po._writtenPaths.size === 0) continue;

        for (const poPath of po._writtenPaths) {
            for (const fmt of compile.format) {
                const outPath = resolveOutputPath(poPath, po, config, fmt);
                compileOne(poPath, outPath, fmt, compile, config.dryRun, stats);
            }
        }
    }

    reportCompileResults(stats, compile.format, config.dryRun);
    return stats;
}

/**
 * Resolve the output path for a compiled file.
 *
 * Uses scan-level compileOutput template if available, otherwise
 * replaces the .po extension with the format extension.
 *
 * compileOutput supports a {format} placeholder with forgiving rules:
 * - {format} with a dot before it → used as-is (e.g. "messages.{format}")
 * - {format} without a dot → dot is auto-added (e.g. "messages{format}" → "messages.json")
 * - no {format} → append ".{format}" at the end
 *
 * @param poPath resolved .po file path
 * @param po po map entry with outputPath and scan reference
 * @param config validated config object
 * @param fmt format string ("json", "js", or "mo")
 * @returns resolved output path string
 */
function resolveOutputPath(poPath, po, config, fmt) {
    const ext = FORMAT_EXTENSIONS[fmt];

    const scan = findScanForPo(po, config);
    if (scan?.compileOutput) {
        const locale = extractLocaleFromPath(poPath, po.outputPath);
        if (locale) {
            const template = normalizeFormatPlaceholder(scan.compileOutput);
            return resolvePlaceholders(template, {locale, format: fmt});
        }
    }

    // Default: replace .po extension
    return poPath.replace(/\.po$/, ext);
}

/**
 * Normalize a compileOutput template for the {format} placeholder.
 *
 * - Has ".{format}" → return as-is
 * - Has "{format}" without dot → insert dot before it
 * - No "{format}" → append ".{format}" at the end
 *
 * @param template compileOutput template string
 * @returns template with normalized {format} placeholder
 */
function normalizeFormatPlaceholder(template) {
    if (template.includes('.{format}')) return template;
    if (template.includes('{format}')) return template.replace('{format}', '.{format}');
    return template + '.{format}';
}

/**
 * Find the scan config entry that owns a given po map entry.
 *
 * @param po po map entry
 * @param config validated config object
 * @returns scan config object or null
 */
function findScanForPo(po, config) {
    for (const scan of config.scans) {
        if (scan.output === po.outputPath || scan.commonOutput === po.outputPath) {
            return scan;
        }
    }
    return null;
}

/**
 * Extract the locale value from a resolved path by comparing with the template.
 *
 * @param resolvedPath e.g. "src/i18n/messages.en.po"
 * @param template e.g. "src/i18n/messages.{locale}.po"
 * @returns locale string or null
 */
function extractLocaleFromPath(resolvedPath, template) {
    const escaped = template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = escaped.replace('\\{locale\\}', '([^/]+)');
    const match = resolvedPath.match(new RegExp(pattern));
    return match ? match[1] : null;
}

/**
 * Compile a single .po file to the target format.
 *
 * @param poPath source .po file path
 * @param outPath target output file path
 * @param fmt format string ("json", "js", or "mo")
 * @param compile compile config { format, compatibilityJSON, skipUntranslated }
 * @param dryRun true to skip writing
 * @param stats stats object to increment
 */
function compileOne(poPath, outPath, fmt, compile, dryRun, stats) {
    if (dryRun) {
        console.log(`  [dry-run] would compile  ${outPath}`);
        stats.compiled++;
        return;
    }

    if (!existsSync(poPath)) {
        stats.skipped++;
        return;
    }

    const raw = readFileSync(poPath, 'utf-8');
    let output;

    if (fmt === 'mo') {
        output = compileMo(raw);
    } else {
        output = compileI18next(raw, fmt, compile);
    }

    if (output == null) {
        stats.skipped++;
        return;
    }

    console.log(`  compiled  ${outPath}`);
    mkdirSync(dirname(outPath), {recursive: true});
    writeFileSync(outPath, output);
    stats.compiled++;
}

/**
 * Compile .po content to .mo binary format.
 *
 * @param raw .po file content string
 * @returns Buffer with .mo binary
 */
function compileMo(raw) {
    const parsed = gettextParser.po.parse(raw);
    return gettextParser.mo.compile(parsed);
}

/**
 * Compile .po content to i18next JSON or JS string.
 *
 * @param raw .po file content string
 * @param fmt format string ("json" or "js")
 * @param compile compile config { compatibilityJSON, skipUntranslated }
 * @returns string — JSON or ES module source
 */
function compileI18next(raw, fmt, compile) {
    const options = {
        compatibilityJSON: compile.compatibilityJSON ?? 'v4',
        skipUntranslated: compile.skipUntranslated ?? true,
    };

    const result = po2i18next(raw, options);

    if (fmt === 'js') {
        return `export default ${JSON.stringify(result, null, 4)};\n`;
    }

    return JSON.stringify(result, null, 4) + '\n';
}

/**
 * Print compile summary.
 *
 * @param stats {{ compiled: number, skipped: number }}
 * @param formats output format names array
 * @param dryRun true if in dry-run mode
 */
function reportCompileResults(stats, formats, dryRun) {
    const prefix = dryRun ? '[dry-run] ' : '';
    const fmtLabel = formats.map((f) => `.${f}`).join(', ');
    console.log(
        `\n${prefix}Compile: ${stats.compiled} file(s) (${fmtLabel})` +
        (stats.skipped > 0 ? `, ${stats.skipped} skipped` : '')
    );
}
