/**
 * Validate a single translation key against the configured convention.
 * Splits the key into sentences using separatorRegex (pre-built from config),
 * then validates each sentence against the pattern.
 *
 * @param key translation key string
 * @param pattern compiled RegExp from getPattern(), or null
 * @param config validated config object
 * @returns true if valid (or no validation), false if invalid
 */
export function isValidKey(key, pattern, config) {
    if (!pattern) return true;

    const {separatorRegex} = config;

    if (!separatorRegex) return pattern.test(key);

    const sentences = key.split(separatorRegex);
    return sentences.every((sentence) => pattern.test(sentence));
}

/**
 * Build a regex that detects the opening of a marker function call on a line.
 * Matches: optional method chain + marker name + opening paren.
 *
 * @param markers array of marker function names
 * @returns RegExp
 */
export function buildMarkerRe(markers) {
    const fnAlt = markers.length === 1 ? markers[0] : `(?:${markers.join('|')})`;
    return new RegExp('(?<!\\w)' + fnAlt + '\\s*\\(', 'g');
}
/**
 * Build a regex that matches lines containing a t() call or namespace override pattern.
 * Used as the upward scan stop condition in parseAnnotationsAbove.
 *
 * @param markers array of translation function names from config
 * @returns RegExp
 */
export function buildStopRegex(markers) {
    const fnAlt = markers.length === 1 ? markers[0] : `(?:${markers.join('|')})`;
    return new RegExp(
        '(?<!\\w)' + fnAlt + '\\s*\\(' +
        '|\\buseTranslation\\s*\\(' +
        '|\\buseI18n\\s*\\(' +
        '|\\bgetFixedT\\s*\\(' +
        '|\\bsetDefaultNamespace\\s*\\(' +
        '|\\/[/*]\\s*i18n-extract-key\\s+'
    );
}

