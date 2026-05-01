import {it} from 'node:test';
import {resolvePlaceholders} from '../../lib/utils/files.js';
import {deriveFileVars} from '../../lib/file-collector.js';

export default function () {
    // resolvePlaceholders
    it('resolvePlaceholders replaces {lastFolderName}, {locale}', () => {
        const result = resolvePlaceholders('{lastFolderName}/i18n/{lastFolderName}.{locale}.po', {
            lastFolderName: 'NavBar',
            locale: 'en',
        });
        if (result !== 'NavBar/i18n/NavBar.en.po') throw new Error(`Got: ${result}`);
    });

    it('resolvePlaceholders replaces {firstFolderPath}, {firstFolderName}, {locale}', () => {
        const result = resolvePlaceholders('{firstFolderPath}/i18n/{firstFolderName}.{locale}.po', {
            firstFolderPath: 'src/components/NavBar',
            firstFolderName: 'NavBar',
            locale: 'en',
        });
        if (result !== 'src/components/NavBar/i18n/NavBar.en.po') throw new Error(`Got: ${result}`);
    });

    it('resolvePlaceholders replaces {scanPath}, {fileName}, {locale}', () => {
        const result = resolvePlaceholders('locales/{locale}/{fileName}.po', {
            scanPath: 'src/components',
            fileName: 'NavBar',
            locale: 'en',
        });
        if (result !== 'locales/en/NavBar.po') throw new Error(`Got: ${result}`);
    });

    it('resolvePlaceholders leaves unset placeholders untouched', () => {
        const result = resolvePlaceholders('{lastFolderName}/i18n/{lastFolderName}.{locale}.po', {
            lastFolderName: 'NavBar',
        });
        if (!result.includes('{locale}')) throw new Error(`{locale} was replaced: ${result}`);
    });

    // resolvePlaceholders
    it('resolvePlaceholders resolves {firstFolderName} to firstFolderName', () => {
        const result = resolvePlaceholders('{firstFolderName}', {firstFolderName: 'NavBar', lastFolderName: 'templates'});
        if (result !== 'NavBar') throw new Error(`Expected NavBar, got ${result}`);
    });

    it('resolvePlaceholders resolves {lastFolderName} to lastFolderName', () => {
        const result = resolvePlaceholders('{lastFolderName}', {firstFolderName: 'NavBar', lastFolderName: 'templates'});
        if (result !== 'templates') throw new Error(`Expected templates, got ${result}`);
    });

    it('resolvePlaceholders returns static string unchanged', () => {
        const result = resolvePlaceholders('translation', {firstFolderName: 'NavBar', lastFolderName: 'templates'});
        if (result !== 'translation') throw new Error(`Expected translation, got ${result}`);
    });

    // deriveFileVars
    it('deriveFileVars: firstFolderPath is first child folder under path', () => {
        const vars = deriveFileVars('NavBar/NavBar.ts', {path: 'src/components'});
        if (vars?.firstFolderName !== 'NavBar') throw new Error(`Expected firstFolder NavBar, got ${vars?.firstFolderName}`);
        if (vars?.firstFolderPath !== 'src/components/NavBar') throw new Error(`Expected firstFolderPath src/components/NavBar, got ${vars?.firstFolderPath}`);
    });

    it('deriveFileVars: deep file still resolves firstFolderName to first child', () => {
        const vars = deriveFileVars('NavBar/templates/NavBar.html.ts', {path: 'src/components'});
        if (vars?.firstFolderName !== 'NavBar') throw new Error(`Expected firstFolder NavBar, got ${vars?.firstFolderName}`);
    });

    it('deriveFileVars: lastFolderPath is directory of source file', () => {
        const vars = deriveFileVars('NavBar/templates/NavBar.html.ts', {path: 'src/components'});
        if (vars?.lastFolderPath !== 'src/components/NavBar/templates') throw new Error(`Expected src/components/NavBar/templates, got ${vars?.lastFolderPath}`);
        if (vars?.lastFolderName !== 'templates') throw new Error(`Expected lastFolder templates, got ${vars?.lastFolderName}`);
    });

    it('deriveFileVars: folder with dots in name', () => {
        const vars = deriveFileVars('Page.Scan/Page.Scan.ts', {path: 'src/pages'});
        if (vars?.firstFolderName !== 'Page.Scan') throw new Error(`Expected firstFolder Page.Scan, got ${vars?.firstFolderName}`);
    });

    it('resolvePlaceholders with {lastFolderName} gives immediate parent folder name', () => {
        const vars = deriveFileVars('NavBar/NavBar.ts', {path: 'src/components'});
        if (vars?.lastFolderName !== 'NavBar') throw new Error(`Expected lastFolder NavBar, got ${vars?.lastFolderName}`);
    });
}
