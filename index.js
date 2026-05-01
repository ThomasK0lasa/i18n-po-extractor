#!/usr/bin/env node

/**
 * i18n-po-extractor
 * Extract i18next t() keys from source files and sync .po translation files.
 *
 * Configuration via i18n-po-extractor.json or package.json under "i18n-po-extractor".
 * Run with --help for full usage.
 */

import {printHelp} from './lib/help.js';
import {loadConfig, assertScanResults} from './lib/config.js';
import {deriveScanVars, collectFiles} from './lib/file-collector.js';
import {buildPoMap, resolveNamespaceOverrides} from './lib/po-map.js';
import {buildKeyMap} from './lib/key-extractor.js';
import {writeAndReport} from './lib/po-builder.js';
import {reportWarningsAndSummary, reportNamespaceMismatches} from './lib/report.js';

const args = process.argv.slice(2);

printHelp(args);

// load and validate config
const {config, root} = loadConfig(args, process.cwd());

// derive scan-level vars (mutates scan configs with pre-resolved fields)
deriveScanVars(config);

// collect source files
const fileList = collectFiles(config, root);

// build po file map and resolve per-file namespace overrides
const poMap = buildPoMap(config, fileList);
const overrideMismatches = resolveNamespaceOverrides(fileList, poMap, root);
reportNamespaceMismatches(overrideMismatches, config);

// enrich config with pre-built regexes and extract keys from source files
const keys = buildKeyMap(fileList, poMap, config, root);

// write .po files and report
const writeResult = writeAndReport(keys, poMap, config);
reportWarningsAndSummary(keys, writeResult, config);

assertScanResults(keys, config);
