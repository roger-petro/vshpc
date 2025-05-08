// test/suite/macroInterpolation.test.ts
import * as assert from 'assert';
import { evaluatePath } from '../../path';
import { expectedResults, baseWindowsSettings as settings } from './test-data.nocommit';
import path from 'path';

suite('evaluatePath()', () => {
    test('Converte do settings.workdir', () => {
        const result = evaluatePath(settings);
        assert.strictEqual(result, expectedResults['test1']['output']);
    });

    test('Converte path with alias', () => {
        const result = evaluatePath(settings, expectedResults['test2']['input']);
        assert.strictEqual(result, expectedResults['test2']['output']);
    });

    // test("gera data no formato YYYY-MM-DD-HH:mm:ss em {date}", () => {
    //   const result = macroInterpolation("Hoje é {date}", baseWindowsSettings);
    //   assert.match(
    //     result,
    //     /^Hoje é \d{4}-\d{2}-\d{2}-\d{2}:\d{2}:\d{2}$/,
    //     "a data não corresponde ao formato esperado"
    //   );
    // });
});
