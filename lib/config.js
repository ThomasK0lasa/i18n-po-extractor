import {existsSync} from 'node:fs';
import {join, resolve, dirname} from 'node:path';
import {loadJson} from './utils/files.js';
import {SENTENCE_PATTERNS, CONVENTION_INTERNAL_SEPARATOR,
    getPattern, buildSeparatorRegex} from './utils/conventions.js';
import {buildStopRegex, buildMarkerRe} from './utils/keys.js';

const CONFIG_KEY = 'i18n-po-extractor';
const CONFIG_FILE = `${CONFIG_KEY}.json`;

const SCAN_DEFAULTS = {
    namespace: null,               // optional — supports {firstFolderName}, {lastFolderName}, {fileName}, or static string
    output: null,                  // required — supports {firstFolderName}, {lastFolderName}, {fileName}, {scanPath}, {locale}
    commonOutput: null,            // output path template for common keys, null to disable
    commonNamespace: null,         // namespace name for common keys, null = 'common'
    extensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'vue', 'html'],
};

const DEFAULTS = {
    locales: null,
    markers: ['t'],
    commonUsageValidation: 'warn',
    forbidDynamic: false,
    namespaceValidationBehavior: 'warn',
    namespaceInKey: false,
    namespaceSeparator: null,
    keyValidation: {
        sentenceNameConvention: null,
        sentenceSeparator: null,
        behavior: 'warn',
    },
    scans: [],
};

/**
 * Load and validate config from:
 *   1. --config <path> CLI arg
 *   2. {cwd}/i18n-po-extractor.json
 *   3. {cwd}/package.json under "i18n-po-extractor" key
 *
 * @param args process.argv slice
 * @param cwd working directory to search for config
 * @returns { config, root } — validated config object and project root path
 */
export function loadConfig(args, cwd) {
    const configIdx = args.indexOf('--config');
    let root = cwd;
    let raw = null;

    if (configIdx !== -1) {
        const configPath = resolve(args[configIdx + 1]);
        root = dirname(configPath);
        const content = loadJson(configPath);
        assertConfigFileFound(content, configPath);
        raw = content[CONFIG_KEY] ?? content;
    }

    if (!raw) {
        const dotConfig = join(root, CONFIG_FILE);
        const pkgConfig = join(root, 'package.json');

        if (existsSync(dotConfig)) {
            const content = loadJson(dotConfig);
            raw = content[CONFIG_KEY] ?? content;
        } else if (existsSync(pkgConfig)) {
            const content = loadJson(pkgConfig);
            raw = content[CONFIG_KEY] ?? null;
        }
    }

    assertConfigFound(raw);
    assertHasFolders(raw);
    assertHasLocales(raw);

    const scans = raw.scans.map(normalizeScan);
    for (const scan of scans) {
        assertScanValid(scan);
    }

    const markers = normalizeMarkers(raw);
    const keyValidation = {...DEFAULTS.keyValidation, ...(raw.keyValidation ?? {})};
    assertKeyValidation(keyValidation);
    const pattern = getPattern(keyValidation.sentenceNameConvention);
    const config = {...DEFAULTS, ...raw, markers, keyValidation, pattern, scans};
    config.separatorRegex = buildSeparatorRegex(config);
    config.stopRe = buildStopRegex(markers);
    config.markerRe = buildMarkerRe(markers);

    return {config, root};
}


/**
 * Normalize a scan entry — string shorthand or partial object — into a full object.
 * @param scan string path or partial scan config object
 * @returns full scan config object with all defaults applied
 */
function normalizeScan(scan) {
    const raw = typeof scan === 'string' ? {path: scan} : scan;
    return {...SCAN_DEFAULTS, ...raw};
}

function assertConfigFound(raw) {
    if (!raw) {
        console.error(`✗ No "${CONFIG_KEY}" config found.`);
        console.error(`  Add ${CONFIG_FILE} or "${CONFIG_KEY}" key in package.json.`);
        process.exit(1);
    }
}

function assertConfigFileFound(content, configPath) {
    if (!content) {
        console.error(`✗ Config file not found: ${configPath}`);
        process.exit(1);
    }
}

function assertHasFolders(raw) {
    if (!raw.scans?.length) {
        console.error(`✗ No scans configured. Add at least one entry to "scans".`);
        process.exit(1);
    }
}

function assertHasLocales(raw) {
    if (!raw.locales?.length) {
        console.error(`✗ Missing required "locales" option.`);
        console.error(`  Example: ["en", "pl"]`);
        process.exit(1);
    }
}

const FILE_LEVEL_PLACEHOLDER_RE = /\{(?:firstFolderPath|firstFolderName|lastFolderPath|lastFolderName|fileName)\}/;

function assertScanValid(scan) {
    if (!scan.output) {
        console.error(`✗ Scan "${scan.path}" is missing required "output" option.`);
        console.error(`  Example: "{firstFolderName}/i18n/{locale}.po" or "locales/{locale}/{firstFolderName}.po".`);
        process.exit(1);
    }
    if (!scan.output.includes('{locale}')) {
        console.error(`✗ Scan "${scan.path}" output must contain {locale}.`);
        console.error(`  Each locale needs its own file — example: "{firstFolderName}/i18n/{locale}.po".`);
        process.exit(1);
    }
    if (scan.commonOutput && !scan.commonOutput.includes('{locale}')) {
        console.error(`✗ Scan "${scan.path}" commonOutput must contain {locale}.`);
        console.error(`  Each locale needs its own file — example: "locales/{locale}/common.po".`);
        process.exit(1);
    }
    if (scan.commonOutput && FILE_LEVEL_PLACEHOLDER_RE.test(scan.commonOutput)) {
        console.error(`✗ Scan "${scan.path}" commonOutput must not use file-level placeholders.`);
        console.error(`  commonOutput is scan-wide — only {locale} and {scanPath} are allowed.`);
        process.exit(1);
    }
    if (scan.commonNamespace && !scan.commonOutput) {
        console.error(`✗ Scan "${scan.path}" commonNamespace has no effect without commonOutput.`);
        console.error(`  Add commonOutput or remove commonNamespace.`);
        process.exit(1);
    }
}

/**
 * Normalize markers — accepts a single string or string array.
 *
 * @param raw raw config object
 * @returns string[]
 */
function normalizeMarkers(raw) {
    if (Array.isArray(raw.markers) && raw.markers.length) return raw.markers;
    if (raw.markers) return [raw.markers];
    return DEFAULTS.markers;
}

/**
 * Validate keyValidation config for conflicts between sentenceSeparator
 * and the internal separator of sentenceNameConvention.
 *
 * @param keyValidation merged keyValidation config object
 */
function assertKeyValidation(keyValidation) {
    const {sentenceNameConvention, sentenceSeparator, behavior} = keyValidation;
    if (!behavior || !sentenceNameConvention || !sentenceSeparator) return;

    const isKnown = sentenceNameConvention in SENTENCE_PATTERNS;

    if (isKnown) {
        const internal = CONVENTION_INTERNAL_SEPARATOR[sentenceNameConvention];
        if (internal && sentenceSeparator === internal) {
            console.error(
                `✗ sentenceSeparator "${sentenceSeparator}" conflicts with` +
                ` sentenceNameConvention "${sentenceNameConvention}" which already uses "${internal}" internally.`
            );
            console.error(`  Suggestions:`);
            console.error(
                `    1. Change sentenceSeparator to a different character` +
                ` (e.g. "${sentenceSeparator === '_' ? '.' : '_'}" or "${sentenceSeparator === '-' ? '.' : '-'}")`
            );
            console.error(`    2. Remove sentenceSeparator entirely`);
            process.exit(1);
        }
    } else {
        let pattern;
        try {
            pattern = new RegExp(sentenceNameConvention);
        } catch {
            return;
        }
        if (pattern.test(sentenceSeparator)) {
            console.error(
                `✗ sentenceSeparator "${sentenceSeparator}" matches` +
                ` the custom sentenceNameConvention regex "${sentenceNameConvention}".`
            );
            console.error(`  This makes sentence splitting ambiguous.`);
            console.error(`  Suggestions:`);
            console.error(`    1. Change sentenceSeparator to a character not matched by the regex`);
            console.error(`    2. Remove sentenceSeparator entirely`);
            process.exit(1);
        }
    }
}

/**
 * Assert that scan results conform to config rules. Exits on violation.
 *
 * @param keys keys object from buildKeyMap
 * @param config validated config object
 */
export function assertScanResults(keys, config) {
    if (config.forbidDynamic && keys.list.some((k) => k.isDynamic)) process.exit(1);
    if (config.keyValidation.behavior === 'error' && keys.list.some((k) => k.hasNamingViolation)) process.exit(1);
}
