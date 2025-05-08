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
import { SettingsType, SubmitOption } from '../../types';
import { Repository } from '../../repository';
import { checkIsRepo, getCurrentHash, getGitProjectName } from '../../git';

let isGit = false;

suite('Git commands', async function (this: Suite) {
    this.timeout(10_000);
    let ctx: vscode.ExtensionContext;
    let modelUri: vscode.Uri;
    let repo: Repository;
    let settings: SettingsType;

    suiteSetup(async function () {
        // ativa a extensão
        const extensionId = 'rogerio-cunha.vshpc'; // confirme no package.json
        const ext = vscode.extensions.getExtension(extensionId);
        assert.ok(ext, `Extensão "${extensionId}" não foi encontrada.`);
        await ext.activate();

        ctx = getExtensionContext();

        settings = await loadSettings(ctx);

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

        /** essa variáveis eu quero sobrescrever em relaçao ao vshpc.json */
        settings.user = baseWindowsSettings.user;
        settings.cluster = baseWindowsSettings.cluster;
        settings.privRsaKey = baseWindowsSettings.privRsaKey;
        settings.passwd = encrypt(process.env.PASSWORD || '');
        settings.account = baseWindowsSettings.account;
    });

    test('Check if is git', async function () {
        let isrepo = await checkIsRepo(settings.workdir);
        if (!isrepo) {
            console.log('Não é um repositório git, escapando os testes');
            this.skip();
        }

        let specificHash = await getCurrentHash(settings.workdir);
        repo = new Repository(settings, specificHash);
        assert.ok(repo.getHash(8).length === 8, 'Comprimento do hash é estranho');
    });

    test('Verifica o nome do diretorio do projeto remoto', async () => {
        let p = await repo.getRemotePath();
        assert.equal(p, process.env.REMOTE_PROJECT_FOLDER);
    });
    test('Verifica o nome do projeto por uma url HTTPS', async () => {
        let p = await getGitProjectName('https://user:passas@site.com:/proj/dir/projeto.git');
        assert.equal(p, 'projeto');
    });
    test('Verifica o nome do projeto por uma url SSH', async () => {
        let p = await getGitProjectName('git@git.site.com:/proj/dir/projeto.git');
        assert.equal(p, 'projeto');
    });
    test('Verifica o diretorio remoto via API do Repository', async () => {
        let p = await repo.getRemotePath();
        assert.equal(p, process.env.REMOTE_PROJECT_FOLDER);
    });
});
