# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] — 2026-10-09

### Breaking changes

- **Compile step enabled by default** — after extraction, `.po` files are now automatically compiled to JSON. This may overwrite files at paths derived from your `.po` output (e.g. `translation.en.po` → `translation.en.json`). Set `compile: null` in your config or pass `--no-compile` to disable.

### Added

- **Compile step** — converts `.po` files to consumable formats after extraction
  - Output formats: `json` (i18next-compatible), `js` (ES module), `mo` (binary gettext)
  - Multi-format support: `format: ["json", "mo"]` compiles to multiple formats in one run
  - `compileOutput` scan option for custom output paths with `{locale}` and `{format}` placeholders
  - `{format}` placeholder is forgiving — auto-adds dot if missing, appends `.{format}` if omitted entirely
  - `skipUntranslated` option (default: `true`) to omit empty translations from compiled output
  - `compatibilityJSON` option (default: `"v4"`) for i18next CLDR v4 plural handling
- `--no-compile` CLI flag to skip compilation
- `--dry-run` now also previews compile output without writing files

### Dependencies

- Added `gettext-converter` (^1.4.0)

## [1.1.0] — 2026-10-09

### Added

- `--dry-run` CLI option — preview `.po` changes without writing files
- `html` added to default scan extensions

### Fixed

- Handle escaped characters (`\n`, `\t`, `\'`, `\"`) properly in key extraction

### Changed

- Codebase-wide switch to JSDoc-style docstrings (`@param`, `@returns`)

### Tests

- Fix test cleanup to remove generated output files between runs
- Remove unwanted fixture files committed by tests

## [1.0.1] — 2026-05-02

### Changed

- Package metadata fix (no code changes)

## [1.0.0] — 2026-05-01

### Added

- Initial release
- Extract `t()` keys from TypeScript/JavaScript/Vue/HTML source files
- Full gettext `.po` file support — `msgctxt`, `msgid_plural`, `#, fuzzy`, `#|` previous, custom headers
- Flexible namespacing — per-file, per-scan, per-folder, or single namespace
- Per-file namespace detection from `useTranslation()`, `useI18n()`, `getFixedT()`, `setDefaultNamespace()`
- All key patterns — static strings, backticks, concatenation, template literals
- Full `t()` options parsing — `context`, `count` (plural), `ns`, variables
- Source references (`#: file.ts:42`)
- Smart merge — preserves translations, obsolete keys (`#~`), fuzzy flag on restored keys
- Translator comments — `#.` preserved and extracted from source via comment markers
- Metadata preservation — `Last-Translator`, `Language-Team`, custom headers, file-level comment blocks
- Common key routing with `commonOutput` and `commonNamespace`
- Key format validation with configurable naming conventions
- Orphan detection for leftover `.po` files after renames
- `--config <path>` for custom config file location
