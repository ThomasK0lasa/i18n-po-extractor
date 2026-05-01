import {existsSync, readFileSync} from 'node:fs';

/**
 * Parse and return JSON from a file path.
 * :param filePath: absolute path to JSON file
 * :returns: parsed object or null if file not found
 */
export function loadJson(filePath) {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, 'utf-8'));
}

/**
 * Normalize path separators to forward slashes.
 * :param p: file path string
 * :returns: normalized path string
 */
export const normalizePath = (p) => p.replace(/\\/g, '/');

/**
 * Resolve a template string by replacing {placeholder} tokens with values from vars.
 * Unrecognised or absent placeholders are left untouched.
 *
 * :param template: template string
 * :param vars: object with placeholder values
 * :returns: resolved string
 */
export function resolvePlaceholders(template, vars) {
    return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] != null ? vars[key] : match);
}
