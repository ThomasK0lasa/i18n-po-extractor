# i18n-po-extractor

Extract [i18next](https://www.i18next.com/) `t()` keys from TypeScript/JavaScript source files and sync `.po` translation files with full [gettext](https://www.gnu.org/software/gettext/) support.

## Features

- **Flexible namespacing** — per-file, per-scan, or single project namespace; translations next to source or in a central directory
- **Full gettext support** — `msgctxt` (context), `msgid_plural`, `#, fuzzy`, `#,` flags, `#|` previous, custom headers all preserved
- **Per-file namespace detection** — `useTranslation()`, `useI18n()`, `getFixedT()` automatically detected and used for routing
- **All key patterns** — static strings, backticks, comment markers, dynamic key warnings
- **Full `t()` options parsing** — `context`, `count` (plural), `ns`, variables all extracted
- **Source references** — `#: file.ts:42` so translators know exactly where each key is used
- **Smart merge** — preserves translations, moves removed keys to `#~` obsolete, fuzzy flag on restored keys
- **Translator comments** — `#.` preserved across runs; also extracted automatically from source via comment markers
- **Metadata preservation** — `Last-Translator`, `Language-Team`, custom headers, file-level comment blocks all preserved
- **Key format validation** — enforce naming conventions with warn or error behavior
- **Compile step** — automatically converts `.po` files to consumable formats (JSON, JS module, MO); supports multi-format output
- **Orphan detection** — leftover `.po` files from renamed or removed components are detected and reported with instructions to clean up manually

---

## Installation

```sh
npm install i18n-po-extractor --save-dev
```

Add to `package.json`:

```json
{
    "scripts": {
        "i18n:extract": "i18n-po-extractor"
    }
}
```

### CLI options

```
i18n-po-extractor [options]

  --config <path>    Path to config file (default: i18n-po-extractor.json or package.json)
  --dry-run          Preview changes without writing any files
  --no-compile       Skip the compile step (po → json/js/mo)
  --help, -h         Print this help and exit
```

Use `--dry-run` to see what the extractor would do — which files would be created or updated and what key counts would change — without modifying anything on disk. The compile step is also previewed in dry-run mode.

---

## Why?

Most i18n setups start simple — one translation file per language — and stay that way long after the project has outgrown it. `i18n-po-extractor` is built around the idea that your translation structure should match your application's loading strategy.

Before reaching for a config, ask yourself one question: **how does my app load?**

**Fully offline / desktop app**
The entire app loads at once, so there is no cost to having all translations in a single file per language. One namespace, one `.po` file per locale. Simple, easy to hand off to a translator.

**SPA / PWA with lazy-loaded routes**
If pages or feature modules load on demand, bundling all translations together means the user downloads strings they may never need. Splitting by page or component keeps each chunk lean — only the translations for what's currently on screen travel over the wire.

**Component library or shared module**
If your components are reused across projects or loaded independently, co-locating translations next to the component source (rather than in a central `locales/` scan) keeps everything self-contained and portable.

**Server-side / Node.js backend**
Typically one namespace per service or module is enough. Translations live in a central scan and are loaded once at startup.

The configuration options in this tool — `namespace`, `output`, `commonOutput` — are just the knobs for expressing whichever of these strategies fits your project.

---

## Configuration

Create `i18n-po-extractor.json` in your project root, or add an `"i18n-po-extractor"` key to `package.json`. Example configs are available at the end of this section.

### Global options

| Option | Type | Default | Description |
|---|---|---|---|
| `locales` | `string[]` | required | Locales to generate `.po` files for |
| `markers` | `string[]` | `["t"]` | Translation function names to look for; also accepts a single string |
| `forbidDynamic` | `boolean` | `false` | Treat dynamic keys as errors (exit 1) |
| `namespaceValidationBehavior` | `string\|null` | `"warn"` | Report files whose `useTranslation` namespace override doesn't match any registered namespace; `"warn"` or `"error"` (exit 1) |
| `namespaceInKey` | `boolean` | `false` | Namespace encoded in the key itself |
| `namespaceSeparator` | `string\|null` | `null` | Separator between namespace and key |
| `keyValidation.sentenceNameConvention` | `string\|null` | `null` | Naming convention to enforce |
| `keyValidation.sentenceSeparator` | `string\|null` | `null` | Additional sentence separator for validation |
| `keyValidation.behavior` | `string\|null` | `"warn"` | `"warn"` or `"error"`; has no effect unless `sentenceNameConvention` is also set |
| `commonUsageValidation` | `string\|null` | `"warn"` | Warn when shared keys could benefit from `commonOutput` but none is configured. `"warn"` or `null` to disable |
| `compile` | `object\|null` | see below | Compile settings. Set to `null` to disable compilation entirely |
| `compile.format` | `string\|string[]` | `"json"` | Output format(s): `"json"`, `"js"`, `"mo"`, or an array like `["json", "mo"]` |
| `compile.compatibilityJSON` | `string` | `"v4"` | i18next compatibility mode (only `"v4"` supported) |
| `compile.skipUntranslated` | `boolean` | `true` | Skip entries with empty translations |

### Scan options

| Option | Type | Default | Description |
|---|---|---|---|
| `path` | `string` | required | Source path to scan |
| `extensions` | `string[]` | `["ts", "tsx", "js", "jsx", "mjs", "vue", "html"]` | File extensions to scan |
| `output` | `string` | required | Output path template<br>Placeholders: `{firstFolderPath}`, `{firstFolderName}`, `{lastFolderPath}`, `{lastFolderName}`, `{fileName}`, `{scanPath}`, `{locale}` |
| `namespace` | `string\|null` | `null` | Optional: written as `X-Namespace` header, enables namespace routing<br>Placeholders: `{firstFolderName}`, `{lastFolderName}`, `{fileName}` |
| `commonOutput` | `string\|null` | `null` | Output template for common keys. When `namespaceInKey: true`: keys without `namespaceSeparator` are routed here. When `namespaceInKey: false`: keys appearing in more than one output file within the same scan group are automatically routed here. `null` disables common routing<br>Placeholders: `{scanPath}`, `{locale}` |
| `commonNamespace` | `string\|null` | `null` | Namespace name written to `X-Namespace` header for the common po file; `null` means no header |
| `compileOutput` | `string\|null` | `null` | Output path template for compiled files. Supports `{locale}` and `{format}` placeholders. `null` = derived from the `.po` output path |

### Namespace placeholders

The `namespace` option supports these placeholders, resolved per source file:

| Placeholder | Resolves to | Example |
|---|---|---|
| `{firstFolderName}` | Name of the first subfolder under `path` | `path: "src/components"`, file `src/components/NavBar/templates/x.ts` → `"NavBar"` |
| `{fileName}` | Source filename minus last extension | `NavBar.html.ts` → `"NavBar.html"` |
| `{lastFolderName}` | Name of the source file's directory | `path: "src/components"`, file `src/components/NavBar/templates/x.ts` → `"templates"` |

Static strings are also supported: `"translation"`, `"my-app"`, etc.

### Output placeholders

The `output` template supports these placeholders:

| Placeholder | Resolves to | Example |
|---|---|---|
| `{firstFolderPath}` | Full path of first subfolder under `path` | `path: "src/components"`, file `NavBar/x.ts` → `src/components/NavBar` |
| `{firstFolderName}` | Name of first subfolder under `path` | `path: "src/components"`, file `NavBar/x.ts` → `NavBar` |
| `{lastFolderPath}` | Full path of the source file's directory | `path: "src/components"`, file `NavBar/templates/x.ts` → `src/components/NavBar/templates` |
| `{lastFolderName}` | Name of the source file's directory | `path: "src/components"`, file `NavBar/templates/x.ts` → `templates` |
| `{fileName}` | Source filename minus last extension | `NavBar.html.ts` → `NavBar.html` |
| `{scanPath}` | The `path` config value | `src/components` |
| `{locale}` | Locale code | `en` |

The `commonOutput` template supports `{scanPath}` and `{locale}` only.

### Example configs

**Simple SPA — single translation file:**
```json
{
    "locales": ["en", "fr"],
    "markers": ["t"],
    "namespaceInKey": false,
    "scans": [
        {
            "path": "src",
            "namespace": "translation",
            "output": "public/i18n/translation.{locale}.po",
        }
    ]
}
```

All keys from every file under `src/` end up in a single file per locale, regardless of where they were defined:

```
src/login.ts     ─┐
src/dashboard.ts  ├→  public/i18n/translation.en.po
src/header.ts    ─┘   public/i18n/translation.fr.po
```

---

**Per-scan namespace, namespace in key, common keys:**
```json
{
    "locales": ["en", "pl"],
    "markers": ["t"],
    "namespaceInKey": true,
    "namespaceSeparator": ".",
    "keyValidation": {
        "sentenceNameConvention": "SCREAMING_SNAKE_CASE",
        "behavior": "warn"
    },
    "scans": [
        {
            "path": "src/components",
            "namespace": "{firstFolderName}",
            "output": "{firstFolderPath}/i18n/{firstFolderName}.{locale}.po",
            "commonOutput": "src/i18n/common.{locale}.po"
        },
        {
            "path": "src/pages",
            "namespace": "{firstFolderName}",
            "output": "{firstFolderPath}/i18n/{firstFolderName}.{locale}.po",
            "commonOutput": "src/i18n/common.{locale}.po"
        }
    ]
}
```

Each component gets its own `.po` file next to its source. Keys without a namespace prefix (no `.` separator) are routed to the shared `common` file instead:

```
src/components/NavBar/NavBar.ts       →  src/components/NavBar/i18n/NavBar.en.po
                                         src/components/NavBar/i18n/NavBar.pl.po
src/pages/Page.Scan/Page.Scan.ts      →  src/pages/Page.Scan/i18n/Page.Scan.en.po
                                         src/pages/Page.Scan/i18n/Page.Scan.pl.po
t('SAVE')  (no namespace prefix)      →  src/i18n/common.en.po
                                         src/i18n/common.pl.po
```

---

**Per-file namespace, central locales, camelCase:**
```json
{
    "locales": ["en", "de"],
    "markers": ["t"],
    "namespaceInKey": false,
    "keyValidation": {
        "sentenceNameConvention": "camelCase",
        "behavior": "warn"
    },
    "scans": [
        {
            "path": "src/components",
            "namespace": "{fileName}",
            "output": "locales/{locale}/{fileName}.po"
        },
        {
            "path": "src/pages",
            "namespace": "{fileName}",
            "output": "locales/{locale}/{fileName}.po"
        }
    ]
}
```

Each source file becomes its own namespace, all outputs collected in a central `locales/` directory:

```
src/components/Navbar.tsx    →  locales/en/Navbar.po
                                locales/de/Navbar.po
src/components/Button.tsx    →  locales/en/Button.po
                                locales/de/Button.po
src/pages/Home.tsx           →  locales/en/Home.po
                                locales/de/Home.po
src/pages/Contact.tsx        →  locales/en/Contact.po
                                locales/de/Contact.po
```

Note that with a central output directory and `namespace: "{fileName}"`, two files with the same name in different source paths will resolve to the same output — for example `src/components/Modal.tsx` and `src/pages/Modal.tsx` would both write to `locales/en/Modal.po` and their keys would be merged. See [Merge Behavior](#merge-behavior) for how that works.

---

**Mixed — components next to source, lib in central locales:**
```json
{
    "locales": ["en", "fr"],
    "markers": ["t"],
    "namespaceInKey": false,
    "scans": [
        {
            "path": "src/components",
            "namespace": "{firstFolderName}",
            "output": "{firstFolderPath}/i18n/{firstFolderName}.{locale}.po",
        },
        {
            "path": "src/lib",
            "namespace": "{fileName}",
            "output": "locales/{locale}/{fileName}.po",
        }
    ]
}
```

Components own their translations; shared library files write to a central directory:

```
src/components/NavBar/NavBar.ts       →  src/components/NavBar/i18n/NavBar.en.po
                                         src/components/NavBar/i18n/NavBar.fr.po
src/lib/validators/email.ts           →  locales/en/email.po
                                         locales/fr/email.po
src/lib/formatters/date.ts            →  locales/en/date.po
                                         locales/fr/date.po
```

---

## Namespace Routing

The extractor uses a **two-pass scan** — pass 1 builds a complete map of all namespaces across all scans, pass 2 extracts keys and routes them using that map.

### Priority order for namespace resolution

1. Explicit `ns:` in `t()` options or `/* i18n-extract-ns namespace */` comment
2. Per-file namespace from `useTranslation()`, `useI18n()`, `getFixedT()`, `setDefaultNamespace()`
3. Common routing (key contains no `namespaceSeparator` + `scan.commonOutput` configured, when `namespaceInKey: true`)
4. Natural scan-derived namespace

### Per-file namespace detection

The following patterns are detected automatically and used for all `t()` calls in that file:

```ts
const {t} = useTranslation('NavBar')         // React
const {t} = useI18n({ns: 'NavBar'})          // Vue
const t = i18next.getFixedT(null, 'NavBar')  // plain i18next
i18next.setDefaultNamespace('NavBar')         // plain i18next
```

### Unknown namespace

If `ns:` points to a namespace not found in any configured scan, the key is **skipped** and a warning is printed:

```
  UNKNOWN NAMESPACE — ns: value not found in any configured scan, key skipped:
    src/components/NavBar/NavBar.ts:15 (ns=nonexistent)
```

To suppress this warning for a known external namespace, use `/* i18n-extract-external */` above or inline with the `t()` call. This marks the namespace as intentionally external, suppresses the warning, and records the reference in the summary. To suppress the warning without recording refs, use `/* i18n-extract-ignore */`.

### Namespace override validation

When a file uses `useTranslation('SomeName')` but `SomeName` doesn't match any namespace registered in pass 1, the file's keys fall back to the file's natural scan namespace. By default (`namespaceValidationBehavior: "warn"`) a warning is printed:

```
  ⚠ NAMESPACE OVERRIDE MISMATCH — override not found in any registered po file:
    src/components/NavBar/NavBar.ts (namespace: UnknownNs)
```

Set to `"error"` to exit with code 1 on any mismatch. Set to `null` to suppress the warning entirely.

To suppress the warning for a known external namespace used via `useTranslation()`, place `/* i18n-extract-external */` above the `useTranslation()` call. This marks the namespace as intentionally external and suppresses the mismatch warning for that file.

---

## Supported Key Patterns

### Static strings

```ts
t('NAV.SETTINGS')
t("NAV.SETTINGS")
t(`NAV.SETTINGS`)
```

```po
#: src/components/NavBar/NavBar.ts:5
msgid "NAV.SETTINGS"
msgstr ""
```

### Method call syntax (dot-notation)

Dot-prefixed calls like `i18n.t()`, `this.t()`, or `this.$i18n.t()` are supported out of the box — no extra config needed. The marker regex uses a non-word lookbehind, so any `.`-prefixed chain resolves to the same marker:

```ts
i18n.t('GREETING')                // ✓ extracted
this.t('GREETING')                // ✓ extracted
this.$i18n.t('GREETING')          // ✓ extracted
app.services.i18n.t('GREETING')   // ✓ extracted
```

This also works with custom markers — if you set `"markers": ["ct"]`, then `i18n.ct('KEY')` is matched the same way.

### Options — context, plural, variables

```ts
t('SAVE', {context: 'verb'})                              // → msgctxt entry
t('ITEMS_COUNT', {count: n})                              // → msgid_plural added
t('WELCOME', {name: user.name, date: today})              // → variable hint in #.
t('STATUS', {context: 'active', count: n, label: 'x'})   // combined
t('KEY', {ns: 'OtherNamespace'})                          // → routed to OtherNamespace
```

```po
msgctxt "verb"
msgid "SAVE"
msgstr ""

#: src/components/NavBar/NavBar.ts:10
msgid "ITEMS_COUNT"
msgid_plural "ITEMS_COUNT_plural"
msgstr[0] ""
msgstr[1] ""

#. Variables: {{name}}, {{date}}
#: src/components/NavBar/NavBar.ts:11
msgid "WELCOME"
msgstr ""

#. Variables: {{label}}
#: src/components/NavBar/NavBar.ts:12
#, fuzzy
msgctxt "active"
msgid "STATUS"
msgid_plural "STATUS_plural"
msgstr[0] ""
msgstr[1] ""
```

You can also add a description to auto-detected variables using a description-only marker:

```ts
/* i18n-extract-var name - user name */
/* i18n-extract-var date - registration date */
t('WELCOME', {name: user.name, date: today})
```

```po
#. Variables: {{name}}, {{date}} — user name and registration date
#: src/components/NavBar/NavBar.ts:11
msgid "WELCOME"
msgstr ""
```

### Dynamic keys — comment markers

Dynamic keys cannot be extracted statically. Use comment markers:

```ts
// i18n-extract-key NAV.ITEM_HOME
/* i18n-extract-key NAV.ITEM_SETTINGS */

navItems.map((item) => t(`NAV.ITEM_${item}`))
```

```po
#: src/components/NavBar/NavBar.ts:3
msgid "NAV.ITEM_HOME"
msgstr ""

#: src/components/NavBar/NavBar.ts:4
msgid "NAV.ITEM_SETTINGS"
msgstr ""
```

### Variable options — comment markers

When options are a variable, declare them with comment markers directly above the `t()` call. Any number of consecutive markers are supported — scanning stops at the first line with no marker:

```ts
/* i18n-extract-context verb - used for the save button */
/* i18n-extract-plural SAVE_plural - plural form */
/* i18n-extract-var var1 - user name */
/* i18n-extract-var var2 - date */
/* i18n-extract-var otherVarName - label */
/* i18n-extract-ns OtherNamespace */
t('SAVE', opts)
```

Inline descriptions after ` - ` are written to the `#.` extracted comment for the translator. Multiple spaces around the dash are also accepted.

```po
#. Context "verb": used for the save button
#. Plural: plural form
#. Variables: {{var1}}, {{var2}}, {{otherVarName}} — user name, date, label
#: src/components/NavBar/NavBar.ts:22
msgctxt "verb"
msgid "SAVE"
msgid_plural "SAVE_plural"
msgstr[0] ""
msgstr[1] ""
```

Multiple contexts produce a separate entry for each:

```ts
/* i18n-extract-context verb */
/* i18n-extract-context noun */
/* i18n-extract-key SAVE */
```

```po
msgctxt "verb"
msgid "SAVE"
msgstr ""

msgctxt "noun"
msgid "SAVE"
msgstr ""
```

### Translator comment

Multiple comment markers are supported and joined as separate `#.` lines:

```ts
/* i18n-extract-comment Keep this very short — fits in navigation bar */
/* i18n-extract-comment Do not translate the brand name */
const label = t('NAV.SETTINGS');
```

```po
#. Keep this very short — fits in navigation bar
#. Do not translate the brand name
#: src/components/NavBar/NavBar.ts:8
msgid "NAV.SETTINGS"
msgstr ""
```

### Annotation reference

Annotation markers are placed **above** the `t()` call, `useTranslation()`, or `/* i18n-extract-key KEY */` declaration they apply to. The extractor scans upward from the target line, collecting any annotation markers it finds, and stops as soon as it hits one of the following:

- another `t()` call (or any configured marker function)
- a `/* i18n-extract-key KEY */` or `// i18n-extract-key KEY` key declaration
- a `useTranslation()`, `useI18n()`, `getFixedT()`, or `setDefaultNamespace()` call
- the beginning of the file

This means annotations can span any number of lines above the call — JSDoc, decorators, blank lines, and other code in between are all skipped over. The scan only stops when it encounters another statement that would "own" the annotations above it.

Because `/* i18n-extract-key KEY */` itself acts as a stop boundary, any annotations you want to attach to it must be placed **above the `i18n-extract-key` line**, not above the `t()` call that follows:

```ts
/* i18n-extract-context verb */
/* i18n-extract-key NAV.ACTION */     ← annotations go above this line, not above t()

navItems.map((item) => t(`NAV.${item}`))
```

`i18n-extract-ignore` and `i18n-extract-external` can also be placed **on the same line** (inline) as the call they apply to.

Both block and line comment styles are accepted for `i18n-extract`, `i18n-extract-ignore`, and `i18n-extract-external`:

```ts
/* i18n-extract-key KEY */
// i18n-extract-key KEY

const label = t(`NAV.${dynamic}`); /* i18n-extract-ignore */
const label = t(`NAV.${dynamic}`); // i18n-extract-ignore
```

All other markers require block comment style (`/* ... */`).

| Marker | Value | Description |
|---|---|---|
| `i18n-extract-key KEY` | key string | Declare a key explicitly — use for dynamic keys that cannot be extracted statically |
| `i18n-extract-comment TEXT` | free text | Translator hint written to `#.` extracted comment; multiple markers are joined as separate lines |
| `i18n-extract-context VALUE` | context string | Adds a `msgctxt` entry; repeat for multiple contexts — each produces a separate `.po` entry |
| `i18n-extract-is-plural` | _(none)_ | Marks key as plural — adds `msgid_plural` and `msgstr[0]`/`msgstr[1]`; use when `count:` is not present in `t()` options |
| `i18n-extract-var NAME - desc` | variable name | Variable hint written to `#.` as `{{NAME}} — desc`; one per line, annotation wins over auto-detected option vars |
| `i18n-extract-ns Namespace` | namespace name | Route the key to a specific namespace instead of the file's natural one |
| `i18n-extract-ignore` | _(none)_ | Suppress dynamic key and unresolvable options warnings; place above or inline |
| `i18n-extract-external` | _(none)_ | Mark a key's `ns:` or a file's `useTranslation()` namespace as external — suppresses unknown namespace warnings and records refs in the summary; place above or inline |

**Inline descriptions** — all markers except `i18n-extract`, `i18n-extract-ignore`, `i18n-extract-is-plural` and `i18n-extract-external` accept an optional description after ` - ` (one or more spaces, dash, one or more spaces). The description is appended to the `#.` extracted comment:

```ts
/* i18n-extract-context verb - used for the save button */
/* i18n-extract-var name - user's display name */
/* i18n-extract-var date - registration date */
t('SAVE', opts)
```

```po
#. Context "verb": used for the save button
#. {{name}} — user's display name
#. {{date}} — registration date
msgctxt "verb"
msgid "SAVE"
msgstr ""
```

When `count:` is present in options, `msgid_plural` is set automatically. Variable hints are auto-detected from static `t()` options — annotations add descriptions to them:

```ts
/* i18n-extract-var name - user's display name */
/* i18n-extract-var date - registration date */
t('WELCOME', {name: user.name, date: today})
```

```po
#. Variables: {{name}}, {{date}} — user's display name and registration date
msgid "WELCOME"
msgstr ""
```

### Suppress warnings

```ts
const label = t(`NAV.${dynamic}`);     /* i18n-extract-ignore */
const label = t(`NAV.${dynamic}`);     // i18n-extract-ignore
const label = t('KEY', someObj);       /* i18n-extract-ignore */
```
---

## .po File Format

Generated `.po` files follow the standard gettext format with full feature support:

```po
# Translation file for NavBar component
# Author: Tomasz Kolasa
#
msgid ""
msgstr ""
"X-Namespace: NavBar\n"
"Language: en\n"
"Last-Translator: Tomasz Kolasa <tomasz@example.com>\n"
"Language-Team: Frontend <frontend@example.com>\n"
"Content-Type: text/plain; charset=UTF-8\n"
"Content-Transfer-Encoding: 8bit\n"

#. Keep this short — fits in navigation bar
#: src/components/NavBar/NavBar.ts:12
#: src/components/NavBar/templates/NavBar.html.ts:8
msgid "NAV.SETTINGS"
msgstr "Settings"

#: src/components/NavBar/NavBar.ts:15
#, fuzzy
msgid "ITEMS_COUNT"
msgid_plural "ITEMS_COUNT_plural"
msgstr[0] ""
msgstr[1] ""

msgctxt "verb"
msgid "SAVE"
msgstr "Zapisz"

#~ msgid "NAV.OLD_KEY"
#~ msgstr "Old translation"
```

### What is preserved across runs

| Element | Preserved |
|---|---|
| `msgstr` translations | ✅ always |
| `msgid_plural` | ✅ always |
| `msgctxt` context | ✅ always |
| `#.` extracted comment | ✅ source wins if present, otherwise existing kept; auto-generated variable hint written if no comment exists and vars are detected |
| `# ` translator comment | ✅ always |
| `#,` flags | ✅ preserved; `fuzzy` added automatically when key is restored from obsolete or newly detected as plural |
| `#|` previous string | ✅ always |
| `#:` source references | ↻ rewritten every run |
| Custom headers (`Last-Translator` etc.) | ✅ always |
| File-level comment block | ✅ always |
| `.po` header block (`msgid ""` / `msgstr ""`) | ✅ preserved as a whole |
| `X-Namespace` | written when `namespace` is configured; preserved if already present |
| `Language`, `Content-Type`, `Content-Transfer-Encoding` | ↻ always updated |
| `Project-Id-Version` | ✅ preserved if set; not written by the tool |

### Fuzzy flag

Set automatically when:
- A key is **restored from obsolete** (translation may be stale)
- A key is **newly detected as plural** (msgid_plural needs filling)

---

## Merge Behavior

| Key state | Action |
|---|---|
| New key not seen before | Added as untranslated (`msgstr ""`) |
| Existing key with translation | Translation preserved |
| Key moved to obsolete, now back in source | Restored with old translation + `#, fuzzy` |
| Key removed from source | Moved to `#~` obsolete |
| Previously obsolete, still not in source | Kept in obsolete |
| Multiple scans → same output file | Keys merged — see strategy below |

**Multi-scan merge strategy**

When multiple source files from different scans resolve to the same output `.po` file, their keys are accumulated into a shared pool during the scan. For each key the following rules apply:

- **refs** (`#:`) — all source references are concatenated
- **vars** — union of all variables across all occurrences
- **comment** (`#.`) — all unique comments across all occurrences are accumulated and deduplicated, joined as separate `#.` lines
- **isPlural** — if any occurrence uses `{count: ...}`, the key becomes plural and gets `#, fuzzy` so the translator knows `msgid_plural` needs reviewing
- **context** — keys with different contexts are treated as separate entries (`msgctxt`)

---

## Key Validation

```json
{
    "keyValidation": {
        "sentenceNameConvention": "SCREAMING_SNAKE_CASE",
        "sentenceSeparator": null,
        "behavior": "warn"
    }
}
```

**Disabling validation:** remove `keyValidation`, set `sentenceNameConvention` to `null`, or set `behavior` to `null`.

### Conventions

| Value | Example |
|---|---|
| `PascalCase` | `ForcedTitle` |
| `camelCase` | `forcedTitle` |
| `snake_case` | `forced_title` |
| `kebab-case` | `forced-title` |
| `flatcase` | `forcedtitle` |
| `UPPERFLATCASE` | `FORCEDTITLE` |
| `Pascal_Snake_Case` | `Forced_Title` |
| `camel_Snake_Case` | `forced_Title` |
| `SCREAMING_SNAKE_CASE` | `FORCED_TITLE` |
| `Train-Case` | `Forced-Title` |
| `COBOL-CASE` | `FORCED-TITLE` |
| `null` | no validation |
| any regex string | must match regex |

**Conflict detection:** if `sentenceSeparator` matches a character used internally by `sentenceNameConvention` (e.g. `sentenceSeparator: "_"` with `SCREAMING_SNAKE_CASE`), the extractor exits with an error and suggests alternatives.

---

## Compile Step

After extracting and syncing `.po` files, the extractor automatically compiles them to consumable formats. This is enabled by default — set `compile: null` in your config or pass `--no-compile` to disable it.

### Output formats

| Format | Extension | Description |
|---|---|---|
| `json` | `.json` | i18next-compatible JSON (default) |
| `js` | `.js` | ES module (`export default {...}`) |
| `mo` | `.mo` | Binary gettext `.mo` file |

Use an array to compile to multiple formats at once:

```json
{
    "compile": {
        "format": ["json", "mo"]
    }
}
```

### Output path resolution

By default, compiled files are placed next to the `.po` file with the extension replaced (e.g. `translation.en.po` → `translation.en.json`).

Use `compileOutput` on a scan to place compiled files elsewhere. The template supports `{locale}` and `{format}` placeholders:

```json
{
    "scans": [
        {
            "path": "src",
            "output": "public/i18n/translation.{locale}.po",
            "compileOutput": "dist/locales/{locale}/messages.{format}"
        }
    ]
}
```

The `{format}` placeholder is forgiving:

| Template | Resolves to (json) |
|---|---|
| `messages.{format}` | `messages.json` |
| `messages{format}` | `messages.json` (dot auto-added) |
| `messages` | `messages.json` (`.{format}` appended) |

### Disabling compilation

Per-project in config:

```json
{
    "compile": null
}
```

Per-run via CLI:

```sh
i18n-po-extractor --no-compile
```

---

## Orphaned Files

When a component is renamed or a scan is restructured, old `.po` files may be left on disk. The extractor detects these by scanning all source paths and output directories for `.po` files that were not written in the current run.

Orphaned files are reported as a warning:

```
  ORPHANED FILES — not written this run, possibly left from a rename or restructure:
  Rename or delete them manually, then re-run extraction.
    src/components/NavBar/i18n/OldNavBar.en.po
    src/components/NavBar/i18n/OldNavBar.pl.po
```

To resolve: rename or delete the orphaned files manually, then re-run. The next run will create fresh `.po` files at the new paths and pick up any existing translations if you renamed rather than deleted.

---

## Console Output

```
  created  src/components/NavBar/i18n/NavBar.en.po  (+3 new)
  updated  src/components/NavBar/i18n/NavBar.pl.po
  updated  src/pages/Page.Scan/i18n/Page.Scan.en.po  (+1 new, -2 obsolete)
  updated  src/i18n/common.en.po
  updated  src/i18n/common.pl.po

  DYNAMIC KEYS — cannot be extracted automatically, use /* i18n-extract-key KEY */ comments:
    src/components/StatusBar/StatusBar.ts:34

  UNRESOLVABLE OPTIONS — t() called with variable options object, use comment markers to declare:
    /* i18n-extract-context CONTEXT */
    /* i18n-extract-plural PLURAL_KEY */
    /* i18n-extract-ns NAMESPACE */
    /* i18n-extract-var var1 */
    /* i18n-extract-var var2 */
    src/components/NavBar/NavBar.ts:22

  UNKNOWN NAMESPACE — ns: value not found in any configured scan, key skipped:
    src/components/NavBar/NavBar.ts:45 (ns=nonexistent)

  ⚠ KEY FORMAT violations (SCREAMING_SNAKE_CASE):
    nav.settings                             src/components/NavBar/NavBar.ts:15

Done.
Files:   2 created, 4 updated, 1 warnings
Keys:    24 total, 2 plural, 1 context
Changes: +4 added, -2 withdrawn, 1 fuzzy, 3 obsolete (across all locales)
```

---

## CLI

```
Usage: i18n-po-extractor [options]

Options:
  --config <path>   Path to config file
  --dry-run         Preview changes without writing any files
  --no-compile      Skip the compile step
  --help, -h        Print help and exit
```

---

## Requirements

- Node.js >= 18.0.0

---

## License

MIT
