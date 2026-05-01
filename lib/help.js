/**
 * Print CLI help and exit.
 */
export function printHelp(args) {
    if (!args.includes('--help') && !args.includes('-h')) return;
    console.log(`
Usage: i18n-po-extractor [options]

Options:
    --config <path>    Path to config file (default: i18n-po-extractor.json or package.json)
    --help, -h         Print this help and exit

Config (i18n-po-extractor.json or package.json key "i18n-po-extractor"):
    locales                               string[]   Locales to generate               (required)
    markers                               string[]   Translation function names         (default: ["t"])
    forbidDynamic                         boolean    Treat dynamic keys as errors       (default: false)
    namespaceValidationBehavior           string     "warn" or "error" for ns overrides  (default: "warn")
    namespaceInKey                        boolean    Namespace encoded in key           (default: false)
    namespaceSeparator                    string     Namespace/key separator            (default: null)
    keyValidation.sentenceNameConvention  string     Naming convention to enforce       (default: null)
    keyValidation.sentenceSeparator       string     Sentence separator for validation  (default: null)
    keyValidation.behavior                string     "warn" or "error"                  (default: "warn")

    scans[]:
        path             string     Source path to scan                   (required)
        output           string     Output path template                  (required)
        namespace        string     X-Namespace header, enables routing   (default: null)
        extensions       string[]   File extensions to scan               (default: ["ts","tsx","js","jsx","mjs","vue"])
        commonOutput     string     Output for common (dot-less) keys     (default: null)
        commonNamespace  string     Namespace name for common keys        (default: null)

Supported key patterns:
    t('KEY')                          static string
    t("KEY")                          static string (double quotes)
    t(\`KEY\`)                        static template literal
    t('A' + 'B')                      concatenated static strings
    t('A' + \`B\`)                    concatenated with backtick
    t(\`KEY.\${dynamic}\`)            dynamic — warns or errors, not extracted
    t(variable)                       dynamic — variable as argument

Annotations (block or line comment):
    /* i18n-extract-key KEY */        explicit key declaration for dynamic/computed calls
    /* i18n-extract-comment TEXT */   translator comment written to #. in .po
    /* i18n-extract-context VALUE */  msgctxt for disambiguation
    /* i18n-extract-is-plural */      mark key as plural (adds msgstr[0] and msgstr[1])
    /* i18n-extract-var VAR - description */ interpolation variable name (one per line)
    /* i18n-extract-ns NAMESPACE */   override namespace for this key
    /* i18n-extract-external */       mark namespace as external — suppress unknown ns warning
    /* i18n-extract-ignore */         ignore this marker call entirely

For full documentation, placeholders, annotation reference and examples see README.md.
`);
    process.exit(0);
}
