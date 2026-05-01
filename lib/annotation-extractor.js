const COMMENT_RE   = /\/\*\s*i18n-extract-comment\s+(.+?)\s*\*\//;
const CONTEXT_RE   = /\/\*\s*i18n-extract-context\s+(.+?)\s*\*\//;
const PLURAL_RE    = /(?:\/\*\s*i18n-extract-is-plural\s*\*\/|\/\/\s*i18n-extract-is-plural\s*$)/;
const NS_RE        = /\/\*\s*i18n-extract-ns\s+(.+?)\s*\*\//;
const VAR_RE       = /(?:\/\*\s*i18n-extract-var\s+(.+?)\s*\*\/|\/\/\s*i18n-extract-var\s+(.+))/;
const IGNORE_RE    = /(?:\/\*\s*i18n-extract-ignore\s*\*\/|\/\/\s*i18n-extract-ignore\s*$)/;
const EXTERNAL_RE  = /(?:\/\*\s*i18n-extract-external\s*\*\/|\/\/\s*i18n-extract-external\s*$)/;
const ANY_ANNOT_RE = /\/[/*]\s*i18n-extract/;

/**
 * Split an annotation value from its optional inline description.
 * Description is separated by \s+-\s+ (one or more spaces, dash, one or more spaces).
 * If value starts with - (description-only), value is empty and desc is the rest.
 *
 * :param s: raw annotation content string
 * :returns: { value, desc }
 */
export function splitDesc(s) {
    const trimmed = s.trim();
    if (trimmed.startsWith('-')) return {value: '', desc: trimmed.slice(1).trim()};
    const m = trimmed.match(/^(.*?)\s+-\s+(.*)$/);
    return m ? {value: m[1].trim(), desc: m[2].trim()} : {value: trimmed, desc: null};
}

/**
 * Scan upward from a line collecting annotation data.
 * Also checks the call's own line for inline ignore and external annotations.
 * Stops when stopRe matches a line or the beginning of the file is reached.
 *
 * :param line: 1-based line number of the t() call or i18n-extract annotation
 * :param contentLines: file content split into lines
 * :param stopRe: regex that terminates the upward scan
 * :returns: annotations object
 */
export function parseAnnotationsAbove(line, contentLines, stopRe) {
    const annotations = {
        comments: [],
        contexts: [],
        vars:     [],
    };

    for (let ln = line; ln >= 1; ln--) {
        const lineText = contentLines[ln - 1];
        if (ln < line && stopRe.test(lineText)) break;
        if (!ANY_ANNOT_RE.test(lineText)) continue;

        const commentMatch = lineText.match(COMMENT_RE);
        if (commentMatch) annotations.comments.push(commentMatch[1].trim());

        const contextMatch = lineText.match(CONTEXT_RE);
        if (contextMatch) {
            const {value: context, desc: contextDesc} = splitDesc(contextMatch[1]);
            annotations.contexts.push({context, contextDesc});
        }

        if (PLURAL_RE.test(lineText)) annotations.isPlural = true;

        if (!annotations.ns) {
            const nsMatch = lineText.match(NS_RE);
            if (nsMatch) annotations.ns = nsMatch[1].trim();
        }

        const varMatch = lineText.match(VAR_RE);
        if (varMatch) {
            const {value: name, desc} = splitDesc(varMatch[1] ?? varMatch[2]);
            if (name) annotations.vars.push({name, desc});
        }

        if (EXTERNAL_RE.test(lineText)) annotations.isExternal = true;
        if (IGNORE_RE.test(lineText)) annotations.ignore = true;
    }

    return annotations;
}
