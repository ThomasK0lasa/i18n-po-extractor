const USE_TRANSLATION_RE    = /\buseTranslation\s*\(\s*['"]([^'"]+)['"]/;
const USE_I18N_RE           = /\buseI18n\s*\(\s*\{[^}]*\bns\s*:\s*['"]([^'"]+)['"]/;
const GET_FIXED_T_RE        = /\bgetFixedT\s*\([^,)]+,\s*['"]([^'"]+)['"]/;
const SET_DEFAULT_NS_RE     = /\bsetDefaultNamespace\s*\(\s*['"]([^'"]+)['"]/;
const EXTERNAL_RE           = /(?:\/\*\s*i18n-extract-external\s*\*\/|\/\/\s*i18n-extract-external\s*$)/;
const NAMESPACE_OVERRIDE_STOP_RE = /\buseTranslation\s*\(|\buseI18n\s*\(|\bgetFixedT\s*\(|\bsetDefaultNamespace\s*\(|\/[/*]\s*i18n-extract-key\s+/;

/**
 * Detect per-file namespace override from known i18next patterns:
 *   useTranslation('ns')         — React
 *   useI18n({ ns: 'ns' })        — Vue
 *   getFixedT(locale, 'ns')      — plain i18next
 *   setDefaultNamespace('ns')    — plain i18next
 *
 * :param lines: file content split into lines
 * :returns: { namespace, line } or null
 */
export function detectNamespaceOverride(lines) {
    const patterns = [USE_TRANSLATION_RE, USE_I18N_RE, GET_FIXED_T_RE, SET_DEFAULT_NS_RE];
    for (let ln = 0; ln < lines.length; ln++) {
        for (const re of patterns) {
            const m = lines[ln].match(re);
            if (m) return {namespace: m[1], line: ln + 1};
        }
    }
    return null;
}

/**
 * Detect whether i18n-extract-external is placed on or directly above the given line.
 * Scans upward until a namespace override pattern is found or the file start is reached.
 *
 * :param lines: file content split into lines
 * :param line: 1-based line number of the namespace override call
 * :returns: true if the external annotation is above or on the line
 */
export function detectExternalAnnotation(lines, line) {
    if (EXTERNAL_RE.test(lines[line - 1] ?? '')) return true;

    for (let ln = line - 1; ln >= 1; ln--) {
        const lineText = lines[ln - 1] ?? '';
        if (NAMESPACE_OVERRIDE_STOP_RE.test(lineText)) break;
        if (EXTERNAL_RE.test(lineText)) return true;
    }

    return false;
}
