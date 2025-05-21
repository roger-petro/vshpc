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
import { adjustSettings, CUSTOM_CONFIG_NAME, CUSTOM_VERSION } from '../../customconfig';
import { jobQueueArray } from '../../jobs';
import { submit } from '../../submit';
import { SettingsType, SubmitOption } from '../../types';
import { Repository } from '../../repository';
import { scpRead, scpWrite } from '../../scp2';

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
        await adjustSettings(ctx);
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

    test('SSH2 Write ', async () => {
        const srcConfig = path.join(
            ctx.extensionUri.fsPath, // raiz do seu projeto de extensão
            'src',
            'test',
            'suite',
            'vshpc.json',
        );
        const destUri = vscode.Uri.joinPath(ctx.globalStorageUri, 'vshpc.json');
        const content = JSON.parse((await fs.readFile(srcConfig)).toString('utf-8'));
        assert.ok('settings' in content, 'Leitura do arquivo de teste para envio não funcionou');
        const destination = path.posix.join(process.env.HOME_UNIX || '', 'vshpc.json');
        if (process.env.HOME_UNIX) {
            const ret = await scpWrite(
                JSON.stringify(content),
                destination,
                settings.cluster,
                settings.user,
                settings.passwd,
                settings.privRsaKey,
            );
            assert.ok(ret, 'Remote file not saved');
        } else {
            assert.fail('HOME_UNIX not defined on .env.test');
        }
    });

    test('SSH2 Read ', async () => {
        settings.usePassword = false;
        if (process.env.HOME_UNIX) {
            const ret = JSON.parse(
                await scpRead(
                    path.posix.join(process.env.HOME_UNIX || '', 'vshpc.json'),
                    settings.cluster,
                    settings.user,
                    settings.passwd,
                    settings.privRsaKey,
                ),
            );
            console.log('            > ret.settings.version:', ret['settings']['version']);
            assert.ok(
                'settings' in ret && 'version' in ret['settings'],
                'Arquivo retornado não contém os objetos',
            );
        } else {
            assert.fail('HOME_UNIX not defined on .env.test');
        }
    });

    test('SSH2 Read configuration on current version', async () => {
        if (process.env.REMOTE_CONFIG_DIR) {
            const fname = path.parse(CUSTOM_CONFIG_NAME).name;
            const fext = path.parse(CUSTOM_CONFIG_NAME).ext;
            const remoteFile = path.posix.join(
                process.env.REMOTE_CONFIG_DIR,
                `${fname}-${CUSTOM_VERSION}.${fext}`,
            );
            const ret = JSON.parse(
                await scpRead(
                    path.posix.join(process.env.HOME_UNIX || '', CUSTOM_CONFIG_NAME),
                    settings.cluster,
                    settings.user,
                    settings.passwd,
                    settings.privRsaKey,
                ),
            );

            console.log('            > ret.settings.version:', ret['settings']['version']);
            assert.ok(
                'settings' in ret && 'version' in ret['settings'],
                'Arquivo de configuração retornado não contém os objetos',
            );
        } else {
            assert.fail('REMOTE_CONFIG_DIR not defined on .env.test');
        }
    });
});
