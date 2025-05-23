// test/suite/macroInterpolation.test.ts
import * as assert from 'assert';
import { macroInterpolation } from '../../path';
import { baseLinuxSettings, baseWindowsSettings } from './test-data.nocommit';
import path from 'path';
import { SettingsType } from '../../types';

suite('00 - Iterpolação de macros', () => {
    let baseSettings: SettingsType;
    suiteSetup(function () {
        baseSettings = baseWindowsSettings;
        if (process.platform === 'linux') {
            baseSettings = baseLinuxSettings;
        }
    });

    test('substitui {user} e {project}', () => {
        const result = macroInterpolation('Usuário: {user} — Projeto: {project}', baseSettings);
        assert.strictEqual(
            result,
            `Usuário: ${baseSettings.user} — Projeto: ${path.parse(baseSettings.workdir).name}`,
        );
    });

    test('insere workdir em {projectDir}', () => {
        const result = macroInterpolation('Trabalho em {projectDir}', baseSettings);
        assert.strictEqual(result, `Trabalho em ${baseSettings.workdir}`);
    });

    test('gera data no formato YYYY-MM-DD-HH:mm:ss em {date}', () => {
        const result = macroInterpolation('Hoje é {date}', baseSettings);
        assert.match(
            result,
            /^Hoje é \d{4}-\d{2}-\d{2}-\d{2}:\d{2}:\d{2}$/,
            'a data não corresponde ao formato esperado',
        );
    });
});
