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
import { adjustSettings, getCustomConfig } from '../../customconfig';
import { jobQueueArray } from '../../jobs';
import { submit } from '../../submit';
import { SettingsType, SubmitOption } from '../../types';
import { Repository } from '../../repository';

suite('03 - Settings and vhspc.json', async function (this: Suite) {
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
        settings.workdir = vscode.workspace?.workspaceFolders?.[0].uri.fsPath || '';
    });

    test('pasta de simulações aberta como workspace', async () => {
        // workspaceFolders[0] é o simFolder que abrimos lá no runTests
        const ws = vscode.workspace.workspaceFolders;
        assert.ok(ws && ws.length > 0, 'nenhuma workspace aberta');
        // confere que o path corresponde ao que passamos
        const opened = ws[0].uri.fsPath;
        //console.log('Workspace aberto em:', opened);
        assert.ok(opened.toLowerCase().length > 0);
    });

    test('posso obter o globalStorageUri e montar o configFileUri', () => {
        const uri = vscode.Uri.joinPath(ctx.globalStorageUri, 'vshpc.json');
        //console.log('configFileUri =', uri.toString());
        assert.ok(uri.path.endsWith('/vshpc.json'));
    });

    test('vshpc.json foi copiado', async () => {
        const data = await vscode.workspace.fs.readFile(
            vscode.Uri.joinPath(ctx.globalStorageUri, 'vshpc.json'),
        );
        assert.ok(data.length > 0);
    });

    test('Check configuration using check() e precheck()', async () => {
        /** essa variáveis eu quero sobrescrever em relaçao ao vshpc.json */

        const ret1 = await precheck();
        let m1 = ret1.match(/falhou|nok|erro/i);
        //console.log(ret1);
        const ret2 = await check();
        let m2 = ret2.match(/falhou|nok|erro/i);
        //console.log(ret2);
        if (m2) {
            console.log('       > Erro no match:', JSON.stringify(m2));
        }
        assert.equal(m1, null, 'Retornou falha, nok ou erro');
        assert.equal(m2, null, 'Retornou falhou, nok ou erro');
    });
        test('Carregar o setup via getConfiguration', async () => {
        const conf = await getCustomConfig(ctx);
        console.log('       > Versão retornada:', conf ? 'settings' in conf && 'version' in conf.settings? conf['settings']['version']: 'Voltou algo errado': 'Conf pode ser null');
        assert.ok(conf && 'settings' in conf && 'version' in conf.settings);
    });
});
