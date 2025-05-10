// test/suite/macroInterpolation.test.ts
import * as assert from 'assert';
import { evaluatePath } from '../../path';
import { linuxTests, winTests, baseLinuxSettings, baseWindowsSettings } from './test-data.nocommit';
import path from 'path';
import { evaluatePathReverse } from '../../utilities/openLog';
import { SettingsType } from '../../types';

suite('01 - Determinação dos paths', () => {
    let tests: typeof linuxTests | typeof winTests;
    let baseSettings: SettingsType;
    suiteSetup(function () {
        tests = winTests;
        baseSettings = baseWindowsSettings;
        if (process.platform === 'linux') {
            tests = linuxTests;
            baseSettings = baseLinuxSettings;
        }
    });

    test('Converte do settings.workdir #01', () => {
        const result = evaluatePath(baseSettings);
        assert.strictEqual(result, tests['test_path_01']['output']);
    });

    test('Converte path with alias #02', () => {
        const result = evaluatePath(baseSettings, tests['test_path_02']['input']);
        assert.strictEqual(result, tests['test_path_02']['output']);
    });
    test('Evaluate reverse path #3', () => {
        const result = evaluatePathReverse(tests['test_path_03']['input']);
        assert.strictEqual(result, tests['test_path_03']['output']);
    });
    test('Evaluate reverse path #4', () => {
        const result = evaluatePathReverse(tests['test_path_04']['input']);
        assert.strictEqual(result, tests['test_path_04']['output']);
    });
    test('Evaluate reverse path #5', () => {
        const result = evaluatePathReverse(tests['test_path_05']['input']);
        assert.strictEqual(result, tests['test_path_05']['output']);
    });
});
