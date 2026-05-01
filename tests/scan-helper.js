import {deriveScanVars, collectFiles} from '../lib/file-collector.js';
import {buildPoMap, resolveNamespaceOverrides} from '../lib/po-map.js';
import {buildKeyMap} from '../lib/key-extractor.js';

/**
 * Test helper — runs the full scan pipeline in one call.
 * Not part of lib — for use in unit tests only.
 */
export function scan(config, root) {
    deriveScanVars(config);
    const fileList = collectFiles(config, root);
    const poMap = buildPoMap(config, fileList);
    resolveNamespaceOverrides(fileList, poMap, root);
    return buildKeyMap(fileList, poMap, config, root);
}

/**
 * Get all occurrences with a given flag set to true.
 * :param keys: keys object from scan()
 * :param flag: flag name e.g. 'isDynamic'
 * :returns: array of matching occurrences
 */
export function getFlagged(keys, flag) {
    return keys.list.filter((k) => k[flag]);
}

/**
 * Get all occurrences for a given key string.
 * :param keys: keys object from scan()
 * :param keyStr: key string to look up
 * :returns: array of matching occurrences
 */
export function getOccurrences(keys, keyStr) {
    return keys.list.filter((k) => k.value === keyStr);
}

/**
 * Check if any occurrence with the given key exists.
 * :param keys: keys object from scan()
 * :param keyStr: key string to check
 * :returns: boolean
 */
export function hasKey(keys, keyStr) {
    return keys.list.some((k) => k.value === keyStr);
}

/**
 * Get all unique po paths that have at least one occurrence.
 * :param keys: keys object from scan()
 * :returns: array of po path strings
 */
export function getPoPaths(keys) {
    return [...keys.byPo.keys()];
}
