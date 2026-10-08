import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isValidKey} from './utils/keys.js';
import {parseAnnotationsAbove} from './annotation-extractor.js';
import {reportCommonUsageWarnings} from './report.js';

const OPTIONS_NS_RE    = /\bns\s*:\s*['"]([^'"]+)['"]/;
const OPTIONS_CTX_RE   = /\bcontext\s*:\s*['"]([^'"]+)['"]/;
const OPTIONS_COUNT_RE = /\bcount\s*:/;
const OPTIONS_KEY_RE   = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
const OPTIONS_RESERVED = new Set(['ns', 'context', 'count', 'defaultValue', 'replace',
    'interpolation', 'returnObjects', 'returnDetails', 'joinArrays',
    'postprocess', 'lng', 'lngs', 'fallbackLng', 'ordinal']);

const ANNOTATION_KEY_RE = /(?:\/\*\s*i18n-extract-key\s+(.+?)\s*\*\/|\/\/\s*i18n-extract-key\s+(.+))/;

/**
 * Extract all translation keys from the file list.
 * Returns raw key occurrences — no merging, no comment building.
 *
 * @param fileList Array of file objects from collectFiles
 * @param poMap Map from buildPoMap
 * @param config validated and enriched config object
 * @param root project root path
 * @returns { keys }
 *   keys.list                — flat array of all raw key occurrences
 *   keys.byPo                — Map<poPath, occurrence[]>
 *   keys.byKey               — Map<keyString, occurrence[]>
 *   keys.byExternalNamespace — Map<nsName, Set<ref>>
 */
export function buildKeyMap(fileList, poMap, config, root) {
    const keys = {
        list:                [],
        byPo:                new Map(),
        byKey:               new Map(),
        byExternalNamespace: new Map(),
    };

    for (const file of fileList) {
        if (!file._content) file._content = readFileSync(join(root, file.filePath), 'utf-8').split('\n');
        parseFile({file, poMap, config, keys});
    }

    rerouteSharedKeysToCommon(fileList, keys, config);

    return keys;
}

/**
 * After all keys are collected, re-route keys that appear in more than one po file
 * within the same commonPoFile group to the common po file.
 * Also detects and reports common usage warnings when commonUsageValidation is 'warn'.
 * Keys are moved entirely — they are removed from per-file byPo entries.
 *
 * @param fileList Array of file objects from collectFiles
 * @param keys keys object from buildKeyMap
 * @param config validated config object
 */
function rerouteSharedKeysToCommon(fileList, keys, config) {
    const groups = new Map();       // commonPoFile -> { poFiles: Set<poFile>, scan }
    const noCommonGroups = new Map(); // scanPath -> { poFiles: Set<poFile>, scan }

    for (const file of fileList) {
        if (!file.poFile) continue;
        const sc = file._scanConfig;
        if (file.commonPoFile) {
            if (!groups.has(file.commonPoFile)) groups.set(file.commonPoFile, {poFiles: new Set(), scan: sc});
            groups.get(file.commonPoFile).poFiles.add(file.poFile);
        } else {
            if (!noCommonGroups.has(sc.path)) noCommonGroups.set(sc.path, {poFiles: new Set(), scan: sc});
            noCommonGroups.get(sc.path).poFiles.add(file.poFile);
        }
    }

    for (const [commonPoFile, {poFiles}] of groups) {
        if (poFiles.size < 2) continue;
        const {groupKeyToOccurrences, groupKeyToPoFiles} = indexOccurrencesByGroupKey(poFiles, keys);
        for (const [groupKey, poFilesForKey] of groupKeyToPoFiles) {
            moveOccurrencesToCommon(groupKey, poFilesForKey, groupKeyToOccurrences, commonPoFile, keys);
        }
    }

    if (config.commonUsageValidation !== 'warn') return;

    const warnings = [];

    for (const [, {poFiles, scan}] of noCommonGroups) {
        if (poFiles.size < 2) continue;

        if (config.namespaceInKey) {
            const unseparated = collectUnseparatedKeys(poFiles, keys, config);
            if (unseparated.length > 0) warnings.push({type: 'unseparated', scan: scan.path, keys: unseparated});
        } else if (!scan.namespace || scan._hasStaticNamespace) {
            const {groupKeyToPoFiles, groupKeyToOccurrences} = indexOccurrencesByGroupKey(poFiles, keys);
            const duplicates = [];
            for (const [groupKey, poFilesForKey] of groupKeyToPoFiles) {
                if (poFilesForKey.size > 1) duplicates.push(groupKeyToOccurrences.get(groupKey)[0].value);
            }
            if (duplicates.length > 0) warnings.push({type: 'duplicates', scan: scan.path, keys: duplicates});
        }
    }

    reportCommonUsageWarnings(warnings);
}

/**
 * Collect keys from a set of po files that lack the namespace separator.
 *
 * @param poFiles Set<poFile>
 * @param keys keys object from buildKeyMap
 * @param config validated config object
 * @returns string[] of unique key values without separator
 */
function collectUnseparatedKeys(poFiles, keys, config) {
    const seen = new Set();
    const result = [];
    for (const poFile of poFiles) {
        for (const occ of keys.byPo.get(poFile) ?? []) {
            if (!occ.value || seen.has(occ.value)) continue;
            seen.add(occ.value);
            if (!occ.value.includes(config.namespaceSeparator)) result.push(occ.value);
        }
    }
    return result;
}

/**
 * Index all occurrences across a set of po files by their group key (value + context).
 *
 * @param poFiles Set<poFile> of per-file po paths in the group
 * @param keys keys object from buildKeyMap
 * @returns { groupKeyToOccurrences, groupKeyToPoFiles }
 */
function indexOccurrencesByGroupKey(poFiles, keys) {
    const groupKeyToOccurrences = new Map(); // groupKey -> occurrence[]
    const groupKeyToPoFiles = new Map();     // groupKey -> Set<poFile>

    for (const poFile of poFiles) {
        const occurrences = keys.byPo.get(poFile) ?? [];
        for (const occ of occurrences) {
            const groupKey = occ.context ? `${occ.value}\x00${occ.context}` : occ.value;
            if (!groupKeyToOccurrences.has(groupKey)) groupKeyToOccurrences.set(groupKey, []);
            if (!groupKeyToPoFiles.has(groupKey)) groupKeyToPoFiles.set(groupKey, new Set());
            groupKeyToOccurrences.get(groupKey).push(occ);
            groupKeyToPoFiles.get(groupKey).add(poFile);
        }
    }

    return {groupKeyToOccurrences, groupKeyToPoFiles};
}

/**
 * Move all occurrences of a shared key from their per-file po paths to the common po path.
 * Only acts when the key appears in more than one po file.
 *
 * @param groupKey value + context composite key string
 * @param poFilesForKey Set<poFile> of po files containing this key
 * @param groupKeyToOccurrences Map<groupKey, occurrence[]>
 * @param commonPoFile target common po path
 * @param keys keys object from buildKeyMap
 */
function moveOccurrencesToCommon(groupKey, poFilesForKey, groupKeyToOccurrences, commonPoFile, keys) {
    if (poFilesForKey.size < 2) return;

    for (const occ of groupKeyToOccurrences.get(groupKey)) {
        const oldPoFile = occ.poPath;
        occ.poPath = commonPoFile;

        const oldList = keys.byPo.get(oldPoFile);
        if (oldList) {
            const idx = oldList.indexOf(occ);
            if (idx !== -1) oldList.splice(idx, 1);
            if (oldList.length === 0) keys.byPo.delete(oldPoFile);
        }

        if (!keys.byPo.has(commonPoFile)) keys.byPo.set(commonPoFile, []);
        keys.byPo.get(commonPoFile).push(occ);
    }
}

/**
 * Process all marker calls and i18n-extract-key annotations in a single pass over the file.
 *
 * @param ctx extraction context { file, poMap, config, keys }
 */
function parseFile(ctx) {
    const lines = ctx.file._content;

    for (let ln = 0; ln < lines.length; ln++) {
        const line = lines[ln];

        const match = line.match(ANNOTATION_KEY_RE);
        if (match) extractArtificialKey(ctx, match, ln);
        else extractNormalKey(ctx, line, ln);
    }
}

/**
 * Handle an i18n-extract-key annotation on the current line.
 *
 * @param ctx extraction context
 * @param match regex match result from ANNOTATION_KEY_RE
 * @param ln 0-based line index
 */
function extractArtificialKey(ctx, match, ln) {
    const annotations = parseAnnotationsAbove(ln + 1, ctx.file._content, ctx.config.stopRe);
    const value = (match[1] ?? match[2]).trim();
    const ref = `${ctx.file.filePath}:${ln + 1}`;
    const key = {value, ref};
    buildKey(ctx, key, annotations);
}

/**
 * Handle all marker function calls on the current line.
 *
 * @param ctx extraction context
 * @param line current line text
 * @param ln 0-based line index
 */
function extractNormalKey(ctx, line, ln) {
    ctx.config.markerRe.lastIndex = 0;
    let m;
    while ((m = ctx.config.markerRe.exec(line)) !== null) {
        const annotations = parseAnnotationsAbove(ln + 1, ctx.file._content, ctx.config.stopRe);
        if (annotations.ignore) continue;

        const key = parseKey(ctx.file._content, ln, m.index + m[0].length);
        if (key.hasSourceError) continue;
        key.ref = `${ctx.file.filePath}:${ln + 1}`;

        if (key.isDynamic) {
            key.poPath = ctx.poMap.get(ctx.file.poFile).outputPath;
            registerKey(ctx.keys, key);
        } else {
            const opts = parseOptions(ctx.file._content, key.endLn, key.afterPos);
            buildKey(ctx, key, annotations, opts);
        }
    }
}

/**
 * Collect the key argument of a marker call starting after the opening paren.
 * Handles quoted strings, template literals, concatenation, and variable/expression arguments.
 * Always returns a key — for dynamic/unresolvable cases key.value contains the raw text for reporting.
 *
 * @param lines file content lines
 * @param ln 0-based line index of the marker call
 * @param afterParen position after the opening paren on ln
 * @returns { value, isDynamic, endLn, afterPos }
 */
function parseKey(lines, ln, afterParen) {
    const {ch, chLn, chPos} = scanToChar(lines, ln, afterParen);

    if (ch === null) return {value: '', hasSourceError: true};

    if (ch !== "'" && ch !== '"' && ch !== '`') {
        // variable or expression as first argument — capture raw text for reporting
        const rest = lines[chLn].slice(chPos);
        const endIdx = rest.search(/[),]/);
        const raw = endIdx === -1 ? rest.trim() : rest.slice(0, endIdx).trim();
        return {value: raw, isDynamic: true};
    }

    let value = '';
    let curLn = chLn;
    let curPos = chPos + 1; // skip opening quote

    // collect first quoted part — backtick may be dynamic
    if (ch === '`') {
        const {content, endLn, afterPos, isDynamic} = scanUntilClose(lines, curLn, curPos, '`');
        if (isDynamic) return {value: content, isDynamic: true};
        value = content;
        curLn = endLn;
        curPos = afterPos;
    } else {
        const closeIdx = lines[curLn].indexOf(ch, curPos);
        if (closeIdx === -1) return {value: '', hasSourceError: true};
        value = lines[curLn].slice(curPos, closeIdx);
        curPos = closeIdx + 1;
    }

    // follow concatenation chain — each + may add another static or dynamic part
    while (true) {
        const {ch: nextCh, chLn: nextLn, chPos: nextPos} = scanToChar(lines, curLn, curPos);
        if (nextCh !== '+') break; // end of concatenation

        const {ch: partCh, chLn: partLn, chPos: partPos} = scanToChar(lines, nextLn, nextPos + 1);
        if (partCh === null) break;

        if (partCh === "'" || partCh === '"') {
            // static string part — append
            const closeIdx = lines[partLn].indexOf(partCh, partPos + 1);
            if (closeIdx === -1) return {value, endLn: partLn, afterPos: partPos + 1};
            value += lines[partLn].slice(partPos + 1, closeIdx);
            curLn = partLn;
            curPos = closeIdx + 1;
        } else if (partCh === '`') {
            // backtick part — static if no ${}, otherwise dynamic
            const {content, endLn, afterPos, isDynamic} = scanUntilClose(lines, partLn, partPos + 1, '`');
            if (isDynamic) return {value: value + content, isDynamic: true};
            value += content;
            curLn = endLn;
            curPos = afterPos;
        } else {
            // variable or expression after + — whole key is dynamic
            const rest = lines[partLn].slice(partPos);
            const endIdx = rest.search(/[),]/);
            const raw = endIdx === -1 ? rest.trim() : rest.slice(0, endIdx).trim();
            return {value: value + raw, isDynamic: true};
        }
    }

    return {value, endLn: curLn, afterPos: curPos};
}

/**
 * Record a static key occurrence with full annotation and options data.
 *
 * @param ctx extraction context
 * @param key key object { value, ref }
 * @param annotations annotation data from parseAnnotationsAbove
 * @param opts parsed options object from parseOptions, or {} for annotation keys
 */
function buildKey(ctx, key, annotations, opts = {}) {
    key.nsOverride         = _nsOverride(opts, annotations);
    key.hasDynamicOptions  = opts.hasDynamicOptions;
    key.isPlural           = _isPlural(opts, annotations);
    key.hasNamingViolation = _hasNamingViolation(key, ctx.config);
    key.isExternal         = _isExternal(annotations, ctx.file, key.nsOverride);
    key.varSets            = _varSets(opts, annotations);
    key.comments           = annotations.comments;
    key.poPath             = resolvePoPath(key, ctx);

    // If multiple contexts - each context creates separate key
    const contexts = _contexts(opts, annotations);
    for (const context of contexts) {
        const entry = {...key, ...context};
        registerKey(ctx.keys, entry);
    }
}

function _nsOverride(opts, annotations) {
    return opts.ns ?? annotations.ns;
}

function _isPlural(opts, annotations) {
    return opts.isPlural || annotations.isPlural;
}

function _varSets(opts, annotations) {
    const annotationNames = new Set(annotations.vars.map(({name}) => name));
    const optsVars = (opts.vars ?? [])
        .filter((v) => !annotationNames.has(v))
        .map((v) => ({name: v, desc: null}));
    return [...annotations.vars, ...optsVars];
}

function _hasNamingViolation(key, config) {
    return !!(config.keyValidation.behavior && !isValidKey(key.value, config.pattern, config));
}

function _isExternal(annotations, file, nsOverride) {
    return annotations.isExternal || (file.isExternalNamespace && nsOverride === file.namespaceOverride);
}

function _contexts(opts, annotations) {
    if (opts.context != null) return [{context: opts.context, contextDesc: null}];
    if (annotations.contexts.length) return annotations.contexts;
    return [{context: '', contextDesc: null}];
}

/**
 * Push an occurrence into the flat list and both index maps.
 * byPo and byKey indexing is skipped when the respective value is absent.
 *
 * @param keys extraction keys object
 * @param key key object to register
 */
function registerKey(keys, key) {
    keys.list.push(key);

    if (key.poPath) {
        if (!keys.byPo.has(key.poPath)) keys.byPo.set(key.poPath, []);
        keys.byPo.get(key.poPath).push(key);
    }

    if (key.value) {
        if (!keys.byKey.has(key.value)) keys.byKey.set(key.value, []);
        keys.byKey.get(key.value).push(key);
    }
}

/**
 * Resolve the output po path for a key based on routing priority:
 *   1. explicit ns override — looked up by namespaceName in poMap
 *   2. common routing (key has no namespaceSeparator + file.commonPoFile configured)
 *   3. natural file po path
 *
 * @param key key object
 * @param ctx extraction context
 * @returns po path string
 */
function resolvePoPath(key, ctx) {
    if (key.nsOverride) {
        if (key.isExternal) return registerExternalKey(key, ctx.keys);

        // poMap is keyed by poFile path — search by namespaceName requires iterating values
        const po = [...ctx.poMap.values()].find((po) => po.namespaceName === key.nsOverride);
        if (po) return po.outputPath;

        key.isUnknownNs = true;
        return ctx.poMap.get(ctx.file.poFile).outputPath;
    }

    if (ctx.config.namespaceInKey && ctx.file.commonPoFile) {
        if (!key.value.includes(ctx.config.namespaceSeparator)) {
            const commonPo = ctx.poMap.get(ctx.file.commonPoFile);
            if (commonPo) return commonPo.outputPath;
        }
    }

    return ctx.poMap.get(ctx.file.poFile).outputPath;
}

function registerExternalKey(key, keys) {
    if (!keys.byExternalNamespace.has(key.nsOverride)) keys.byExternalNamespace.set(key.nsOverride, new Set());
    keys.byExternalNamespace.get(key.nsOverride).add(key.ref);
}

/**
 * Find the first non-whitespace character starting at a given position, scanning across lines.
 *
 * @param lines file content lines
 * @param startLn 0-based line index to start from
 * @param startPos character position on startLn to start from
 * @returns { ch, chLn, chPos } — ch is null if not found
 */
function scanToChar(lines, startLn, startPos) {
    for (let ln = startLn; ln < lines.length; ln++) {
        const chunk = lines[ln].slice(ln === startLn ? startPos : 0);
        const offset = ln === startLn ? startPos : 0;
        for (let i = 0; i < chunk.length; i++) {
            if (chunk[i] !== ' ' && chunk[i] !== '\t' && chunk[i] !== '\r') {
                return {ch: chunk[i], chLn: ln, chPos: offset + i};
            }
        }
    }
    return {ch: null, chLn: startLn, chPos: startPos};
}

/**
 * Collect content until a closing character, scanning across lines.
 * Used for backtick template literals — detects ${} as dynamic.
 *
 * @param lines file content lines
 * @param startLn 0-based line index to start from (after opening char)
 * @param startPos character position to start from
 * @param closeChar character that ends the collection
 * @returns { content, endLn, afterPos, isDynamic }
 */
function scanUntilClose(lines, startLn, startPos, closeChar) {
    let content = '';
    let isDynamic = false;

    for (let ln = startLn; ln < lines.length; ln++) {
        const chunk = lines[ln].slice(ln === startLn ? startPos : 0);
        for (let i = 0; i < chunk.length; i++) {
            if (chunk[i] === '$' && chunk[i + 1] === '{') isDynamic = true;
            if (chunk[i] === closeChar) {
                const offset = ln === startLn ? startPos : 0;
                content += chunk.slice(0, i);
                return {content, endLn: ln, afterPos: offset + i + 1, isDynamic};
            }
        }
        if (ln > startLn) content += '\n';
        content += chunk;
    }

    return {content, endLn: startLn, afterPos: startPos, isDynamic};
}

/**
 * Parse options from a t() call — collects the raw string then parses it into an object.
 *
 * @param lines file content lines
 * @param startLn 0-based line index where search begins
 * @param afterKey character position after the last closing quote
 * @returns parsed options object
 */
function parseOptions(lines, startLn, afterKey) {
    const optStr = parseOptionsArg(lines, startLn, afterKey);
    return parseOptionsObject(optStr);
}

/**
 * Collect the raw options argument string of a t() call starting after the closing key quote.
 * Scans forward character by character to find a comma that is inside the t() parens (depth 0),
 * then collects content until the matching closing paren of t().
 * A comma that appears at or after the closing paren of t() belongs to the surrounding
 * structure and is not treated as an options separator.
 *
 * @param lines file content lines
 * @param startLn 0-based line index where search begins
 * @param afterKey character position after the last closing quote on startLn
 * @returns raw options string or empty string if absent
 */
function parseOptionsArg(lines, startLn, afterKey) {
    // Phase 1: scan forward to find a comma inside t() before its closing paren.
    // depth tracks nested parens inside t() — we start just after the key argument.
    let depth = 0;
    let commaLn = -1;
    let commaPos = -1;

    outer:
    for (let ln = startLn; ln < lines.length; ln++) {
        const line = lines[ln];
        const start = ln === startLn ? afterKey : 0;
        for (let i = start; i < line.length; i++) {
            const ch = line[i];
            if (ch === '(') { depth++; continue; }
            if (ch === ')') {
                if (depth === 0) break outer; // closing paren of t() — no options arg
                depth--;
                continue;
            }
            if (ch === ',' && depth === 0) {
                commaLn = ln;
                commaPos = i;
                break outer;
            }
        }
    }

    if (commaLn === -1) return '';

    // Phase 2: collect from after the comma until the closing paren of t() at depth 0.
    let collected = '';
    depth = 0;

    for (let ln = commaLn; ln < lines.length; ln++) {
        const line = lines[ln];
        const start = ln === commaLn ? commaPos + 1 : 0;
        for (let i = start; i < line.length; i++) {
            const ch = line[i];
            if (ch === '(') { depth++; collected += ch; continue; }
            if (ch === ')') {
                if (depth === 0) return collected.trim();
                depth--;
                collected += ch;
                continue;
            }
            collected += ch;
        }
        if (ln > commaLn) collected += '\n';
    }

    return collected.trim();
}

/**
 * Parse options object from a t() call string.
 * Handles static object literals only — returns hasDynamicOptions for variable references.
 *
 * @param optStr string content of the options argument
 * @returns { ns, context, isPlural, vars } or { hasDynamicOptions: true }
 */
function parseOptionsObject(optStr) {
    if (!optStr) return {};
    const s = optStr.trim();
    if (!s.startsWith('{')) return {hasDynamicOptions: true};

    const result = {vars: []};

    const nsMatch = s.match(OPTIONS_NS_RE);
    if (nsMatch) result.ns = nsMatch[1];

    const ctxMatch = s.match(OPTIONS_CTX_RE);
    if (ctxMatch) result.context = ctxMatch[1];

    if (OPTIONS_COUNT_RE.test(s)) result.isPlural = true;

    for (const m of s.matchAll(OPTIONS_KEY_RE)) {
        if (!OPTIONS_RESERVED.has(m[1])) result.vars.push(m[1]);
    }

    return result;
}
