import * as assert from 'assert';
import { Suite } from 'mocha';
import path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

import { baseWindowsSettings, expectedResults } from './test-data.nocommit';

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
import { SubmitOption } from '../../types';
import { Repository } from '../../repository';

suite('Test Commands', async function (this: Suite) {
    this.timeout(100_000);
    let ctx: vscode.ExtensionContext;
    let modelUri: vscode.Uri;

    suiteSetup(async function () {
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

        const settings = await loadSettings(ctx);

        /** essa variáveis eu quero sobrescrever em relaçao ao vshpc.json */
        settings.user = baseWindowsSettings.user;
        settings.cluster = baseWindowsSettings.cluster;
        settings.privRsaKey = baseWindowsSettings.privRsaKey;
        settings.passwd = encrypt(process.env.PASSWORD || '');
        settings.account = baseWindowsSettings.account;
    });

    test('posso obter o globalStorageUri e montar o configFileUri', () => {
        const uri = vscode.Uri.joinPath(ctx.globalStorageUri, 'vshpc.json');
        console.log('configFileUri =', uri.toString());
        assert.ok(uri.path.endsWith('/vshpc.json'));
    });

    test('vshpc.json foi copiado', async () => {
        const data = await vscode.workspace.fs.readFile(
            vscode.Uri.joinPath(ctx.globalStorageUri, 'vshpc.json'),
        );
        assert.ok(data.length > 0);
    });

    test('SSH Connection test', async () => {
        const settings = await loadSettings(ctx);

        /** essa variáveis eu quero sobrescrever em relaçao ao vshpc.json */
        settings.user = baseWindowsSettings.user;
        settings.cluster = baseWindowsSettings.cluster;
        settings.privRsaKey = baseWindowsSettings.privRsaKey;
        settings.passwd = encrypt(process.env.PASSWORD || '');
        settings.account = baseWindowsSettings.account;
        const ret = await vscode.commands.executeCommand<string>('rogerio-cunha.vshpc.jobCheckSSH');
        assert.strictEqual(ret, '200');
    });

    test('Job de teste', async () => {
        const settings = await loadSettings(ctx);

        /** essa variáveis eu quero sobrescrever em relaçao ao vshpc.json */
        settings.user = baseWindowsSettings.user;
        settings.cluster = baseWindowsSettings.cluster;
        settings.privRsaKey = baseWindowsSettings.privRsaKey;
        settings.passwd = encrypt(process.env.PASSWORD || '');
        settings.account = baseWindowsSettings.account;
        const ret = await vscode.commands.executeCommand<string>('rogerio-cunha.vshpc.jobMock');
        assert.strictEqual(ret, '200');
    });

    // test('Show Settings', async () => {
    //     const ctx = getExtensionContext();
    //     const settings = await loadSettings(ctx);
    //     await adjustSettings(ctx);
    //     console.log(JSON.stringify(settings));
    //     // sem asserts aqui
    // });

    test('Check configuration', async () => {
        const settings = await loadSettings(ctx);
        await adjustSettings(ctx);
        /** essa variáveis eu quero sobrescrever em relaçao ao vshpc.json */
        settings.user = baseWindowsSettings.user;
        settings.cluster = baseWindowsSettings.cluster;
        settings.privRsaKey = baseWindowsSettings.privRsaKey;
        settings.passwd = encrypt(process.env.PASSWORD || '');
        settings.account = baseWindowsSettings.account;

        const ret1 = await precheck();
        let m1 = ret1.match(/falhou|nok|erro/i);
        //console.log(ret1);
        const ret2 = await check();
        let m2 = ret2.match(/falhou|nok|erro/i);
        //console.log(ret2);
        assert.equal(m1, null, 'Retornou falha, nok ou erro');
        assert.equal(m2, null, 'Retornou falhou, nok ou erro');
    });

    test('pasta de simulações aberta como workspace', async () => {
        // workspaceFolders[0] é o simFolder que abrimos lá no runTests
        const ws = vscode.workspace.workspaceFolders;
        assert.ok(ws && ws.length > 0, 'nenhuma workspace aberta');
        // confere que o path corresponde ao que passamos
        const opened = ws[0].uri.fsPath;
        console.log('Workspace aberto em:', opened);
        assert.ok(opened.toLowerCase().includes('usuarios'));
    });

    test('Envio de um model sem git', async () => {
        const simRootUri = vscode.workspace.workspaceFolders![0].uri;
        modelUri = vscode.Uri.joinPath(simRootUri, process.env.MODEL_NAME || 'bogus.file');
        const settings = await loadSettings(ctx);
        await adjustSettings(ctx);
        settings.user = baseWindowsSettings.user;
        settings.cluster = baseWindowsSettings.cluster;
        settings.privRsaKey = baseWindowsSettings.privRsaKey;
        settings.passwd = encrypt(process.env.PASSWORD || '');
        settings.account = baseWindowsSettings.account;
        settings.solverName = baseWindowsSettings.solverName;
        settings.solverVersion = baseWindowsSettings.solverVersion;
        settings.solverCores = baseWindowsSettings.solverCores;
        settings.solverNodes = baseWindowsSettings.solverNodes;
        settings.solverExtras = baseWindowsSettings.solverExtras;
        const ret = await submit(
            process.env.MODEL_NAME || 'bogus.file',
            settings,
            SubmitOption.direct,
            false,
            null,
        );
        console.log('Retorno do submit:', ret);
        assert.equal(ret.success, true);
    });

    // test('Envio de um model com git', async () => {
    //     const simRootUri = vscode.workspace.workspaceFolders![0].uri;
    //     modelUri = vscode.Uri.joinPath(simRootUri, process.env.MODEL_NAME || 'bogus.file');
    //     const settings = await loadSettings(ctx);
    //     await adjustSettings(ctx);
    //     settings.user = baseWindowsSettings.user;
    //     settings.cluster = baseWindowsSettings.cluster;
    //     settings.privRsaKey = baseWindowsSettings.privRsaKey;
    //     settings.passwd = encrypt(process.env.PASSWORD || '');
    //     settings.account = baseWindowsSettings.account;
    //     settings.solverName = baseWindowsSettings.solverName;
    //     settings.solverVersion = baseWindowsSettings.solverVersion;
    //     settings.solverCores = baseWindowsSettings.solverCores;
    //     settings.solverNodes = baseWindowsSettings.solverNodes;
    //     settings.solverExtras = baseWindowsSettings.solverExtras;
    //     const repo = new Repository(settings, '');
    //     const ret = await submit(
    //         process.env.MODEL_NAME || 'bogus.file',
    //         settings,
    //         SubmitOption.git,
    //         false,
    //         repo,
    //     );
    //     console.log('Retorno do submit:', ret);
    //     assert.equal(ret.success, true);
    // });
});
