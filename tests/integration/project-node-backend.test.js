import {it} from 'node:test';
/**
 * Tests for fake-project-node — Node.js backend pattern.
 * Per-file namespace, snake_case validation.
 */
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {runIn, parsePo, getKeys, cleanupProject} from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = join(__dirname, '..', 'fixtures', 'fake-project-node');

export default function () {
    it('creates one .po per source file (file boundary)', () => {
        cleanupProject(projectDir);
        runIn(projectDir);
        if (!existsSync(join(projectDir, 'locales/en/userController.po'))) throw new Error('userController.po not created');
        if (!existsSync(join(projectDir, 'locales/en/authController.po'))) throw new Error('authController.po not created');
        if (!existsSync(join(projectDir, 'locales/en/emailService.po'))) throw new Error('emailService.po not created');
        if (!existsSync(join(projectDir, 'locales/en/errorHandler.po'))) throw new Error('errorHandler.po not created');
    });

    it('keys from each controller are isolated to its file namespace', () => {
        const userPo = join(projectDir, 'locales/en/userController.po');
        const authPo = join(projectDir, 'locales/en/authController.po');
        const userKeys = getKeys(parsePo(userPo));
        const authKeys = getKeys(parsePo(authPo));
        if (!userKeys.includes('user_not_found')) throw new Error('user_not_found not in userController');
        if (userKeys.includes('invalid_credentials')) throw new Error('invalid_credentials leaked into userController');
        if (!authKeys.includes('invalid_credentials')) throw new Error('invalid_credentials not in authController');
    });

    it('snake_case validation passes for valid keys', () => {
        const result = runIn(projectDir);
        // all keys in node project are snake_case — no violations expected
        const output = result.stdout + result.stderr;
        if (output.includes('KEY FORMAT')) throw new Error('Unexpected key format violations');
    });

    it('writeNamespaceHeader false omits X-Namespace header', () => {
        const userPo = join(projectDir, 'locales/en/userController.po');
        const data = parsePo(userPo);
        if (data?.headers?.['X-Namespace']) throw new Error('X-Namespace header should not be present');
    });

    it('output goes to central locales directory', () => {
        if (!existsSync(join(projectDir, 'locales'))) throw new Error('locales/ dir not created');
        if (existsSync(join(projectDir, 'src/controllers/i18n'))) throw new Error('.po files written next to source');
    });
}
