import {basename, dirname, join} from 'node:path';
import {globSync} from 'glob';
import {normalizePath, resolvePlaceholders} from './utils/files.js';

const FILE_LEVEL_PLACEHOLDERS = /\{(?:firstFolderPath|firstFolderName|lastFolderPath|lastFolderName|fileName)\}/;

/**
 * Derive scan-level vars and mutate each scan config with pre-resolved fields.
 * Must run before collectFiles so per-file work can be skipped for static scans.
 *
 * Adds to each scan config:
 *   _commonPoFile        — resolved common po path or null
 *   _commonNamespaceName — resolved common namespace name or null
 *   _staticPoFile        — resolved po path if output has no file-level placeholders, else null
 *   _staticNamespaceName — resolved namespace if namespace has no file-level placeholders, else null
 *
 * @param config validated config object
 */
export function deriveScanVars(config) {
    for (const scan of config.scans) {

        if (scan.commonOutput) {
            scan._commonPoFile = resolvePlaceholders(scan.commonOutput, {scanPath: scan.path});
            scan._commonNamespace = scan.commonNamespace;
        }

        scan._hasStaticPo = !FILE_LEVEL_PLACEHOLDERS.test(scan.output);
        if (scan._hasStaticPo) scan._staticPoFile = resolvePlaceholders(scan.output, {scanPath: scan.path});

        scan._hasStaticNamespace = scan.namespace && !FILE_LEVEL_PLACEHOLDERS.test(scan.namespace);
        if (scan._hasStaticNamespace) {
            scan._staticNamespace = resolvePlaceholders(scan.namespace, {scanPath: scan.path});
        }
    }
}

/**
 * Collect all source files across all configured folders.
 * Uses staticFileVars for scans whose output and namespace templates contain no file-level placeholders.
 *
 * @param config validated config object (must have been passed through deriveScanVars)
 * @param root project root path
 * @returns Array of file objects — path vars + _scanConfig
 */
export function collectFiles(config, root) {
    const fileList = [];
    for (const scanConfig of config.scans) {
        const exts = scanConfig.extensions;
        const extPattern = exts.length === 1 ? exts[0] : `{${exts.join(',')}}`;
        const files = globSync(`**/*.${extPattern}`, {cwd: join(root, scanConfig.path)});
        const isStatic = scanConfig._hasStaticPo;
        for (const file of files) {
            const fileObj = isStatic ? staticFileVars(file, scanConfig) : deriveFileVars(file, scanConfig);
            fileList.push(fileObj);
        }
    }
    return fileList;
}

/**
 * Build a lightweight file object for static scans (no file-level placeholders in output/namespace).
 * Skips expensive path derivation — only filePath is computed.
 *
 * @param file file path as returned by globSync (relative to scanPath)
 * @param scanConfig scan config object (already passed through deriveScanVars)
 * @returns file object with _scanConfig and filePath only
 */
function staticFileVars(file, scanConfig) {
    const filePath = normalizePath(join(normalizePath(scanConfig.path), file));
    return {_scanConfig: scanConfig, filePath};
}

/**
 * Derive path variables from a glob-returned file path and its scan config.
 *
 * @param file file path as returned by globSync (relative to scanPath)
 * @param scanConfig scan config object
 * @returns {
 *   _scanConfig     — original scan config (read-only reference)
 *   filePath        — full normalized path from project root
 *   firstFolderPath — full path of the first child folder under folderPath (for output templates)
 *   lastFolderPath  — full path of the source file's directory (for output templates)
 *   firstFolderName — basename of firstFolderPath (for namespace templates)
 *   lastFolderName  — basename of lastFolderPath (for namespace templates)
 *   fileName        — source filename minus last extension (for namespace templates)
 *   scanPath        — normalized scan config path
 * }
 */
export function deriveFileVars(file, scanConfig) {
    const normFolder = normalizePath(scanConfig.path);
    const filePath = normalizePath(join(normFolder, file));

    const rest = filePath.slice(normFolder.length + 1);
    const firstChild = rest.split('/')[0];

    const lastFolderPath = normalizePath(dirname(filePath));
    const firstFolderPath = `${normFolder}/${firstChild}`;
    const fileBase = basename(file);
    const fileName = fileBase.includes('.') ? fileBase.slice(0, fileBase.lastIndexOf('.')) : fileBase;
    const firstFolderName = firstChild;
    const lastFolderName = basename(lastFolderPath);

    return {
        _scanConfig: scanConfig,
        filePath,
        firstFolderPath,
        lastFolderPath,
        firstFolderName,
        lastFolderName,
        fileName,
        scanPath: normFolder,
    };
}

