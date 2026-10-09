import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import gettextParser from 'gettext-parser';

const {po} = gettextParser;
const __dirname = dirname(fileURLToPath(import.meta.url));

export const bin = join(__dirname, '..', 'index.js');
export const fakeProjectsDir = join(__dirname, 'fixtures');
export const projectDir = join(fakeProjectsDir, 'fake-project-custom-1');
export const configPath = join(projectDir, 'i18n-po-extractor.json');

/**
 * Run the CLI against a given project directory.
 * :param projectPath: absolute path to the project root
 * :param extraArgs: additional CLI arguments
 * :returns: { code, stdout, stderr }
 */
export function runIn(projectPath, ...extraArgs) {
    const cfg = join(projectPath, 'i18n-po-extractor.json');
    const result = spawnSync('node', [bin, '--config', cfg, ...extraArgs], {
        encoding: 'utf-8',
        cwd: projectPath,
    });
    return {
        code: result.status ?? 1,
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
    };
}

/**
 * Run the CLI with an explicit config file path.
 * Unlike runIn, does not prepend a default --config.
 * :param projectPath: absolute path to use as cwd
 * :param configPath: absolute path to config file
 * :returns: { code, stdout, stderr }
 */
export function runWithConfig(projectPath, configPath) {
    const result = spawnSync('node', [bin, '--config', configPath], {
        encoding: 'utf-8',
        cwd: projectPath,
    });
    return {
        code: result.status ?? 1,
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
    };
}

/**
 * Run the CLI against the main fake-project-custom-1.
 * :param extraArgs: additional CLI arguments
 */
export function run(...extraArgs) {
    return runIn(projectDir, ...extraArgs);
}

/**
 * Parse a .po file and return the gettext-parser result, or null if not found.
 * :param filePath: absolute path to .po file
 */
export function parsePo(filePath) {
    if (!existsSync(filePath)) return null;
    return po.parse(readFileSync(filePath));
}

/**
 * Compile a parsed PO object back to a Buffer.
 * :param data: gettext-parser PO object
 */
export const compilePo = (data) => po.compile(data);

/**
 * Get active translation keys from a parsed PO object.
 * :param poData: gettext-parser result
 * :returns: string[]
 */
export const getKeys = (poData) =>
    Object.keys(poData?.translations?.[''] ?? {}).filter((k) => k !== '');

/**
 * Get obsolete keys from a parsed PO object.
 * :param poData: gettext-parser result
 * :returns: string[]
 */
export const getObsolete = (poData) =>
    Object.keys(poData?.obsolete?.[''] ?? {});

/**
 * Remove all generated output files from a project directory.
 * :param projectPath: absolute path to the project root
 */
export function cleanupProject(projectPath) {
    const toRemove = [
        join(projectPath, 'locales'),
        join(projectPath, 'public'),
        join(projectPath, 'src/i18n'),
    ];
    // also remove all i18n subdirectories next to source
    const srcDirs = ['src/components', 'src/pages', 'src/lib'];
    for (const srcDir of srcDirs) {
        const full = join(projectPath, srcDir);
        if (existsSync(full)) {
            try {
                const entries = readdirSync(full);
                for (const entry of entries) {
                    toRemove.push(join(full, entry, 'i18n'));
                }
            } catch {}
        }
    }
    for (const dir of toRemove) {
        if (existsSync(dir)) rmSync(dir, {recursive: true});
    }
}

/**
 * Recursively collect .po files into the backup map.
 * :param dir: current directory to scan
 * :param root: root directory for relative path calculation
 * :param backup: Map to store absolutePath → content
 */
function collectPoRecursive(dir, root, backup) {
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            collectPoRecursive(full, root, backup);
        } else if (entry.name.endsWith('.po')) {
            backup.set(full, readFileSync(full));
        }
    }
}

/**
 * Snapshot all .po files under the given subdirectories of a project.
 * :param baseDir: project root directory
 * :param subDirs: subdirectories to scan for .po files
 * :returns: Map of absolutePath → Buffer
 */
export function backupPoFiles(baseDir, subDirs) {
    const backup = new Map();
    for (const sub of subDirs) {
        const full = join(baseDir, sub);
        if (!existsSync(full)) continue;
        collectPoRecursive(full, full, backup);
    }
    return backup;
}

/**
 * Restore .po files from a backup map, recreating directories as needed.
 * :param backup: Map of absolutePath → Buffer (from backupPoFiles)
 */
export function restorePoFiles(backup) {
    for (const [filePath, content] of backup) {
        mkdirSync(dirname(filePath), {recursive: true});
        writeFileSync(filePath, content);
    }
}

/**
 * Cleanup the main fake-project-custom-1.
 */
export function cleanup() {
    cleanupProject(projectDir);
}
