# Changelog

2.0.0 (2026-10-09):

* feat: compile step — converts `.po` to consumable formats (`json`, `js`, `mo`) after extraction
* feat: multi-format support (`format: ["json", "mo"]`), `compileOutput` with `{locale}`/`{format}` placeholders
* feat: `skipUntranslated` option, `compatibilityJSON` option for i18next CLDR v4 plurals
* feat: `--no-compile` CLI flag, `--dry-run` now also previews compile output
* feat: `{format}` placeholder auto-adds dot if missing, appends `.{format}` if omitted
* chore: added `gettext-converter` (^1.4.0) dependency

BREAKING: compile step enabled by default — `.po` files are now compiled to JSON after extraction.
Set `compile: null` or pass `--no-compile` to disable.

1.1.0 (2026-10-09):

* feat: `--dry-run` option, `html` added as default scan extension
* fix: handle escaped characters properly in key extraction
* style: JSDoc docstrings
* test: fix cleanup, remove unwanted generated files

1.0.1 (2026-05-02):

* chore: package metadata fix (no code changes)

1.0.0 (2026-05-01):

* feat: initial release
* feat: extract `t()` keys from TypeScript/JavaScript/Vue/HTML source files
* feat: full gettext `.po` file support — `msgctxt`, `msgid_plural`, `#, fuzzy`, `#|` previous, custom headers
* feat: flexible namespacing — per-file, per-scan, per-folder, or single namespace
* feat: per-file namespace detection from `useTranslation()`, `useI18n()`, `getFixedT()`, `setDefaultNamespace()`
* feat: all key patterns — static strings, backticks, concatenation, template literals
* feat: full `t()` options parsing — `context`, `count` (plural), `ns`, variables
* feat: source references (`#: file.ts:42`)
* feat: smart merge — preserves translations, obsolete keys (`#~`), fuzzy flag on restored keys
* feat: translator comments — `#.` preserved and extracted from source via comment markers
* feat: metadata preservation — `Last-Translator`, `Language-Team`, custom headers, file-level comment blocks
* feat: common key routing with `commonOutput` and `commonNamespace`
* feat: key format validation with configurable naming conventions
* feat: orphan detection for leftover `.po` files after renames
* feat: `--config <path>` for custom config file location
