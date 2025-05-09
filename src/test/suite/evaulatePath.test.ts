// test/suite/macroInterpolation.test.ts
import * as assert from 'assert';
import { evaluatePath } from '../../path';
import { expectedResults, baseSettings as settings } from './test-data.nocommit';
import path from 'path';
import { evaluatePathReverse } from '../../utilities/openLog';

suite('evaluatePath()', () => {
    test('Converte do settings.workdir', () => {
        const result = evaluatePath(settings);
        assert.strictEqual(result, expectedResults['test_path_01']['output']);
    });

    test('Converte path with alias', () => {
        const result = evaluatePath(settings, expectedResults['test_path_02']['input']);
        assert.strictEqual(result, expectedResults['test_path_02']['output']);
    });
    test('Evaluate reverse path #1', () => {
        const result = evaluatePathReverse(expectedResults['test_path_03']['input']);
        assert.strictEqual(result, expectedResults['test_path_03']['output']);
    });
    test('Evaluate reverse path #2', () => {
        const result = evaluatePathReverse(expectedResults['test_path_04']['input']);
        assert.strictEqual(result, expectedResults['test_path_04']['output']);
    });
});
