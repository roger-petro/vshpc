import * as assert from 'assert';
import { Suite } from 'mocha';
import path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

import { linuxTests, winTests, baseLinuxSettings, baseWindowsSettings } from './test-data.nocommit';

import {
    checkAccountSettings,
    setSettings,
    getSettings,
    setWorkDir,
    loadSettings,
} from '../../settings';

import { getExtensionContext } from '../../extension';
import { check, precheck } from '../../settingscheck';
import { encrypt } from '../../crypto';
import { adjustSettings } from '../../customconfig';
import { jobQueueArray } from '../../jobs';
import { submit } from '../../submit';
import { SettingsType, SubmitOption } from '../../types';
import { Repository } from '../../repository';

suite('02 - Network related tests', async function (this: Suite) {
    this.timeout(100_000);
    let ctx: vscode.ExtensionContext;
    let modelUri: vscode.Uri;
    let tests: typeof linuxTests | typeof winTests;
    let baseSettings: SettingsType;
    let settings: SettingsType;

    suiteSetup(async function () {
        tests = winTests;
        baseSettings = baseWindowsSettings;
        if (process.platform === 'linux') {
            tests = linuxTests;
            baseSettings = baseLinuxSettings;
        }
        // ativa a extensão
        const extensionId = 'rogerio-cunha.vshpc'; // confirme no package.json
        const ext = vscode.extensions.getExtension(extensionId);
        assert.ok(ext, `Extensão "${extensionId}" não foi encontrada.`);
        await ext.activate();

        ctx = getExtensionContext();

        const srcConfig = path.join(
            ctx.extensionUri.fsPath, // raiz do seu projeto de extensão
            'src',
            'test',
            'suite',
            'vshpc.json',
        );

        assert.ok(srcConfig, 'Nenhuma workspace aberta nos testes!');
        const destUri = vscode.Uri.joinPath(ctx.globalStorageUri, 'vshpc.json');

        const content = await fs.readFile(srcConfig);
        // grava no storage da extensão, sobrescrevendo se já existir
        await vscode.workspace.fs.writeFile(destUri, content);

        settings = await loadSettings(ctx);

        /** essa variáveis eu quero sobrescrever em relaçao ao vshpc.json */
        settings.user = baseSettings.user;
        settings.cluster = baseSettings.cluster;
        settings.privRsaKey = baseSettings.privRsaKey;
        settings.passwd = encrypt(process.env.PASSWORD || '');
        settings.account = baseSettings.account;
    });

    test('Password Connection test', async () => {
        settings.usePassword = true;
        const ret = await vscode.commands.executeCommand<string>('rogerio-cunha.vshpc.jobCheckSSH');
        assert.strictEqual(ret, '200');
    });

    test('SSH Connection test', async () => {
        settings.usePassword = false;
        const ret = await vscode.commands.executeCommand<string>('rogerio-cunha.vshpc.jobCheckSSH');
        assert.strictEqual(ret, '200');
    });
});
