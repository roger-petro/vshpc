// test/suite/macroInterpolation.test.ts
import * as assert from 'assert';
import { evaluatePath } from '../../path';
import { expectedResults, baseWindowsSettings as settings } from './test-data.nocommit';
import path from 'path';

suite('evaluatePath()', () => {
    test('Converte do settings.workdir', () => {
        const result = evaluatePath(settings);
        assert.strictEqual(result, expectedResults['test_path_01']['output']);
    });

    test('Converte path with alias', () => {
        const result = evaluatePath(settings, expectedResults['test_path_02']['input']);
        assert.strictEqual(result, expectedResults['test_path_02']['output']);
    });
});
