/**
 * Shared constants for key naming convention validation.
 */

// Pattern for each sentence convention — validates one complete sentence.
export const SENTENCE_PATTERNS = {
    PascalCase:           /^[A-Z][a-zA-Z0-9]*$/,
    camelCase:            /^[a-z][a-zA-Z0-9]*$/,
    snake_case:           /^[a-z][a-z0-9]*(_[a-z][a-z0-9]*)*$/,
    'kebab-case':         /^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/,
    flatcase:             /^[a-z][a-z0-9]*$/,
    UPPERFLATCASE:        /^[A-Z][A-Z0-9]*$/,
    Pascal_Snake_Case:    /^[A-Z][a-zA-Z0-9]*(_[A-Z][a-zA-Z0-9]*)*$/,
    camel_Snake_Case:     /^[a-z][a-zA-Z0-9]*(_[A-Z][a-zA-Z0-9]*)*$/,
    SCREAMING_SNAKE_CASE: /^[A-Z][A-Z0-9]*(_[A-Z][A-Z0-9]*)*$/,
    'Train-Case':         /^[A-Z][a-zA-Z0-9]*(-[A-Z][a-zA-Z0-9]*)*$/,
    'COBOL-CASE':         /^[A-Z][A-Z0-9]*(-[A-Z][A-Z0-9]*)*$/,
};

// Internal separator used by each convention (if any).
export const CONVENTION_INTERNAL_SEPARATOR = {
    snake_case:           '_',
    'kebab-case':         '-',
    Pascal_Snake_Case:    '_',
    camel_Snake_Case:     '_',
    SCREAMING_SNAKE_CASE: '_',
    'Train-Case':         '-',
    'COBOL-CASE':         '-',
};

/**
 * Get the validation regex for a given sentenceNameConvention.
 * Known convention names use preset patterns.
 * Any other string is treated as a custom regex.
 *
 * @param convention convention name or regex string or null
 * @returns RegExp or null if no validation
 */
export function getPattern(convention) {
    if (!convention) return null;
    const preset = SENTENCE_PATTERNS[convention];
    if (preset) return preset;
    try {
        return new RegExp(convention);
    } catch (e) {
        throw new Error(
            `sentenceNameConvention "${convention}" is not a known convention and is not a valid regex: ${e.message}`
        );
    }
}

/**
 * Build a regex that splits a key on all configured separators.
 * Returns null if no separators are configured.
 *
 * @param config validated config object
 * @returns RegExp or null
 */
export function buildSeparatorRegex(config) {
    const {namespaceInKey, namespaceSeparator, keyValidation} = config;
    const sentenceSeparator = keyValidation?.sentenceSeparator;

    const separators = new Set();
    if (namespaceInKey && namespaceSeparator) separators.add(namespaceSeparator);
    if (sentenceSeparator) separators.add(sentenceSeparator);

    if (separators.size === 0) return null;

    return new RegExp('[' + [...separators].map((s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')).join('') + ']');
}
