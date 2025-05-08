// test/suite/macroInterpolation.test.ts
import * as assert from 'assert';
import { macroInterpolation } from '../../path';
import { baseWindowsSettings } from './test-data.nocommit';
import path from 'path';

suite('function macroInterpolation()', () => {
    test('substitui {user} e {project}', () => {
        const result = macroInterpolation(
            'Usuário: {user} — Projeto: {project}',
            baseWindowsSettings,
        );
        assert.strictEqual(
            result,
            `Usuário: ${baseWindowsSettings.user} — Projeto: ${
                path.parse(baseWindowsSettings.workdir).name
            }`,
        );
    });

    test('insere workdir em {projectDir}', () => {
        const result = macroInterpolation('Trabalho em {projectDir}', baseWindowsSettings);
        assert.strictEqual(result, `Trabalho em ${baseWindowsSettings.workdir}`);
    });

    test('gera data no formato YYYY-MM-DD-HH:mm:ss em {date}', () => {
        const result = macroInterpolation('Hoje é {date}', baseWindowsSettings);
        assert.match(
            result,
            /^Hoje é \d{4}-\d{2}-\d{2}-\d{2}:\d{2}:\d{2}$/,
            'a data não corresponde ao formato esperado',
        );
    });
});
