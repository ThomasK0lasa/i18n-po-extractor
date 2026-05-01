import {it} from 'node:test';
import {getPattern, buildSeparatorRegex} from '../../lib/utils/conventions.js';
import {isValidKey} from '../../lib/utils/keys.js';

export default function () {
    // getPattern
    it('getPattern returns null for null convention', () => {
        if (getPattern(null) !== null) throw new Error('Expected null');
    });

    it('getPattern returns RegExp for known convention', () => {
        const p = getPattern('SCREAMING_SNAKE_CASE');
        if (!(p instanceof RegExp)) throw new Error('Expected RegExp');
    });

    it('getPattern treats unknown string as custom regex', () => {
        const p = getPattern('^[A-Z]+$');
        if (!(p instanceof RegExp)) throw new Error('Expected RegExp');
    });

    it('getPattern throws for invalid regex string', () => {
        let threw = false;
        try { getPattern('[invalid'); } catch { threw = true; }
        if (!threw) throw new Error('Expected error for invalid regex');
    });

    // isValidKey — no namespace
    it('isValidKey returns true when no pattern', () => {
        if (!isValidKey('anything', null, {})) throw new Error('Expected true');
    });

    it('isValidKey validates whole key when namespaceInKey is false', () => {
        const p = getPattern('camelCase');
        const config = {namespaceInKey: false};
        if (!isValidKey('forcedTitle', p, config)) throw new Error('forcedTitle should be valid camelCase');
        if (isValidKey('ForcedTitle', p, config)) throw new Error('ForcedTitle should be invalid camelCase');
    });

    // isValidKey — with namespaceSeparator
    it('isValidKey splits on namespaceSeparator and validates each segment', () => {
        const p = getPattern('SCREAMING_SNAKE_CASE');
        const config = {namespaceInKey: true, namespaceSeparator: '.', keyValidation: {}};
        config.separatorRegex = buildSeparatorRegex(config);
        if (!isValidKey('LANG.FORCED_TITLE', p, config)) throw new Error('LANG.FORCED_TITLE should be valid');
        if (isValidKey('lang.FORCED_TITLE', p, config)) throw new Error('lang segment should fail SCREAMING_SNAKE');
    });

    it('isValidKey splits on sentenceSeparator additionally', () => {
        const p = getPattern('UPPERFLATCASE');
        const config = {namespaceInKey: true, namespaceSeparator: '.', keyValidation: {sentenceSeparator: '_'}};
        config.separatorRegex = buildSeparatorRegex(config);
        if (!isValidKey('LANG_RULE', p, config)) throw new Error('LANG_RULE should be valid with sentenceSeparator _');
    });
}
