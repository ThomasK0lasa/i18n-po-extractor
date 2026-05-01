import {it} from 'node:test';
import {join} from 'node:path';
import {existsSync} from 'node:fs';
import {projectDir, run, parsePo, getKeys} from '../helpers.js';

const navbarPo = join(projectDir, 'src/components/NavBar/i18n/NavBar.en.po');
const navbarPlPo = join(projectDir, 'src/components/NavBar/i18n/NavBar.pl.po');

export default function () {
    it('exits with code 0', () => {
        const result = run();
        if (result.code !== 0) throw new Error(`Expected exit 0, got ${result.code}\n${result.stderr}`);
    });

    it('creates .po files for each locale', () => {
        if (!existsSync(navbarPo)) throw new Error('NavBar.en.po not created');
        if (!existsSync(navbarPlPo)) throw new Error('NavBar.pl.po not created');
    });

    it('extracts static keys with single quotes', () => {
        const keys = getKeys(parsePo(navbarPo));
        if (!keys.includes('NAV.SETTINGS')) throw new Error('NAV.SETTINGS not found');
    });

    it('extracts static keys with double quotes', () => {
        const keys = getKeys(parsePo(navbarPo));
        if (!keys.includes('NAV.ABOUT')) throw new Error('NAV.ABOUT not found');
    });

    it('extracts static keys with backticks', () => {
        const keys = getKeys(parsePo(navbarPo));
        if (!keys.includes('NAV.EMPTY')) throw new Error('NAV.EMPTY not found');
    });

    it('extracts comment annotation keys (block comment)', () => {
        const keys = getKeys(parsePo(navbarPo));
        if (!keys.includes('NAV.ITEM_HOME')) throw new Error('NAV.ITEM_HOME not found');
        if (!keys.includes('NAV.ITEM_SETTINGS')) throw new Error('NAV.ITEM_SETTINGS not found');
    });

    it('extracts comment annotation keys (line comment)', () => {
        const keys = getKeys(parsePo(navbarPo));
        if (!keys.includes('NAV.ITEM_HOME')) throw new Error('NAV.ITEM_HOME (line comment) not found');
    });
}
