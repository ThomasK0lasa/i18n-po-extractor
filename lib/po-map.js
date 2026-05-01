import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {resolvePlaceholders} from './utils/files.js';
import {detectNamespaceOverride, detectExternalAnnotation} from './utils/namespace.js';

/**
 * Build the po file map from all collected files (pass 1a).
 * Resolves output paths, enriches file objects, and registers all po files.
 * Must run before resolveNamespaceOverrides so the complete map is available for cross-scan routing.
 *
 * :param config: validated config object (must have been passed through deriveScanVars)
 * :param fileList: Array of file objects from collectFiles
 * :returns: poMap — Map<poFile, { outputPath, namespaceName }>
 */
export function buildPoMap(config, fileList) {
    const poMap = new Map();

    for (const scan of config.scans) {
        if (scan._commonPoFile) {
            registerPoFile(poMap, {
                outputPath:    scan._commonPoFile,
                namespaceName: scan._commonNamespace,
            });
        }
    }

    for (const file of fileList) {
        const {_scanConfig: sc} = file;

        let namespaceName = null;
        if (sc._hasStaticNamespace) {
            namespaceName = sc._staticNamespace;
        } else if (sc.namespace) {
            namespaceName = resolvePlaceholders(sc.namespace, file);
        }

        const poFile = sc._hasStaticPo ? sc._staticPoFile : resolvePlaceholders(sc.output, file);

        file.namespaceName = namespaceName;
        file.poFile = poFile;
        file.commonPoFile = sc._commonPoFile;

        registerPoFile(poMap, {outputPath: poFile, namespaceName});
    }

    return poMap;
}

/**
 * Resolve per-file namespace overrides against the complete po map (pass 1b).
 * Reads each source file to detect useTranslation() / useI18n() / getFixedT() overrides.
 * Updates file.poFile when a match is found.
 * Flags external files (i18n-extract-external) to suppress mismatch reporting.
 *
 * :param fileList: Array of file objects from collectFiles (already enriched by buildPoMap)
 * :param poMap: Map from buildPoMap
 * :param root: project root path
 * :returns: overrideMismatches — Array of { filePath, overrideName } for unresolved overrides
 */
export function resolveNamespaceOverrides(fileList, poMap, root) {
    const overrideMismatches = [];

    for (const file of fileList) {
        if (!file.namespaceName) continue;

        const lines = readFileSync(join(root, file.filePath), 'utf-8').split('\n');
        file._content = lines;
        const result = detectNamespaceOverride(lines);
        const namespaceOverride = result ? result.namespace : null;
        const usesExternalNamespace = result ? detectExternalAnnotation(lines, result.line) : false;

        file.namespaceOverride = namespaceOverride;
        file.isExternalNamespace = usesExternalNamespace;

        if (!namespaceOverride) continue;

        const matched = [...poMap.values()].find((e) => e.namespaceName === namespaceOverride);
        if (matched) {
            file.poFile = matched.outputPath;
        } else if (!usesExternalNamespace) {
            overrideMismatches.push({filePath: file.filePath, overrideName: namespaceOverride});
        }
    }

    return overrideMismatches;
}

function registerPoFile(poMap, entry) {
    if (!poMap.has(entry.outputPath)) {
        poMap.set(entry.outputPath, entry);
    }
}

