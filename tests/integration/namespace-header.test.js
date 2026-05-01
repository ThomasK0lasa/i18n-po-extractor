import {it} from 'node:test';
import {join} from 'node:path';
import {projectDir, parsePo} from '../helpers.js';

const navbarPo = join(projectDir, 'src/components/NavBar/i18n/NavBar.en.po');
const pageScanPo = join(projectDir, 'src/pages/Page.Scan/i18n/Page.Scan.en.po');

export default function () {
    it('writes X-Namespace header to .po files', () => {
        const data = parsePo(navbarPo);
        if (!data?.headers?.['X-Namespace']) throw new Error('X-Namespace header missing');
    });

    it('X-Namespace matches the component namespace', () => {
        const data = parsePo(navbarPo);
        if (data.headers['X-Namespace'] !== 'NavBar') throw new Error(`Expected NavBar, got ${data.headers['X-Namespace']}`);
    });

    it('X-Namespace is correct for page namespace with dot', () => {
        const data = parsePo(pageScanPo);
        if (data.headers['X-Namespace'] !== 'Page.Scan') throw new Error(`Expected Page.Scan, got ${data.headers['X-Namespace']}`);
    });
}
