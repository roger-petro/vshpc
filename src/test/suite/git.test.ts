import * as assert from 'assert';
import { Suite } from 'mocha';
import path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

import { baseSettings, expectedResults } from './test-data.nocommit';

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
import { FolderFormats, SettingsType, SubmitOption } from '../../types';
import { Repository } from '../../repository';
import { checkIsRepo, getCurrentHash, getGitProjectName } from '../../git';

let isGit = false;

suite('Git commands', async function (this: Suite) {
    this.timeout(10_000);
    let ctx: vscode.ExtensionContext;
    let modelUri: vscode.Uri;
    let repo: Repository;
    let settings: SettingsType;
    let specificHash: string;

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
        settings.user = baseSettings.user;
        settings.cluster = baseSettings.cluster;
        settings.privRsaKey = baseSettings.privRsaKey;
        settings.passwd = encrypt(process.env.PASSWORD || '');
        settings.account = baseSettings.account;
    });
    test('Check if is git', async function () {
        let isrepo = await checkIsRepo(settings.workdir);
        if (!isrepo) {
            console.log('Não é um repositório git, escapando os testes');
            this.skip();
        }
        assert.ok(isrepo, 'Não é repo');
    });

    test('Get hash', async function () {
        specificHash = (await getCurrentHash(settings.workdir)) || '';
        assert.ok(specificHash.length > 0);
    });

    test('Create repo Object', async function () {
        repo = new Repository(settings, specificHash);
        assert.ok(repo.getHash('full') === specificHash);
    });

    test('Get Local Metadata Object', async function () {
        await repo.getLocalMetaData(null);
        assert.ok(repo.getGitServer().includes('.git'));
    });

    test('Get Remote Metadata Object', async function () {
        await repo.getRemoteMetaData();
        assert.ok(repo.getIsRemotePath, 'Remote path não foi encontrado');
    });

    test('Verifica o nome do diretorio do projeto remoto', async () => {
        let p = await repo.getRemotePath();
        //console.log(p);
        assert.equal(p, process.env.REMOTE_PROJECT_FOLDER);
    });
    test('Verifica o diretorio remoto via API do Repository', async () => {
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

    test('Nome da pasta de clonagem remota #1', async () => {
        if (process.platform === 'win32') {
            settings.folderFormat = 'projectName_hash';
            settings.destination = expectedResults.test_git_01.destination;
            if (Object.keys(FolderFormats).includes(settings.folderFormat)) {
                settings.folderFormat = (FolderFormats as Record<string, string>)[
                    settings.folderFormat
                ];
            }
            await repo.getRemoteMetaData();
            let p = await repo.getRemoteClonePath();
            let remote = expectedResults.test_git_01.prefix + repo.getHash(8);
            console.log('     ›', 'Pasta via getRemoteClonePath:', p);
            console.log('     ›', 'Pasta remota esperada:       ', remote);
            assert.ok(p === remote, 'Pasta não conferem');
        } else {
            console.log('     ›', 'Falta este teste no Linux');
        }
    });

    test('Nome da pasta de clonagem remota #2', async () => {
        if (process.platform === 'win32') {
            settings.folderFormat = 'projectName_hash';
            settings.destination = expectedResults.test_git_02.destination;
            if (Object.keys(FolderFormats).includes(settings.folderFormat)) {
                settings.folderFormat = (FolderFormats as Record<string, string>)[
                    settings.folderFormat
                ];
            }
            await repo.getRemoteMetaData();
            let p = await repo.getRemoteClonePath();
            let remote = expectedResults.test_git_02.prefix + repo.getHash(8);
            console.log('     ›', 'Pasta via getRemoteClonePath:', p);
            console.log('     ›', 'Pasta remota esperada:       ', remote);
            assert.ok(p === remote, 'Pasta não conferem');
        } else {
            console.log('     ›', 'Falta este teste no Linux');
        }
    });
    test('Nome da pasta de clonagem remota #3', async () => {
        if (process.platform === 'win32') {
            settings.folderFormat = 'projectName_hash';
            settings.destination = expectedResults.test_git_03.destination;
            if (Object.keys(FolderFormats).includes(settings.folderFormat)) {
                settings.folderFormat = (FolderFormats as Record<string, string>)[
                    settings.folderFormat
                ];
            }
            await repo.getRemoteMetaData();
            let p = await repo.getRemoteClonePath();
            let remote = expectedResults.test_git_03.prefix + repo.getHash(8);
            console.log('     ›', 'Pasta via getRemoteClonePath:', p);
            console.log('     ›', 'Pasta remota esperada:       ', remote);
            assert.ok(p === remote, 'Pasta não conferem');
        } else {
            console.log('     ›', 'Falta este teste no Linux');
        }
    });
    test('Nome da pasta de clonagem remota #4', async () => {
        if (process.platform === 'win32') {
            settings.folderFormat = 'projectName_YYYY.MM.DD_tag_hash';
            settings.destination = expectedResults.test_git_04.destination;
            const hash = expectedResults.test_git_04.commit;
            if (Object.keys(FolderFormats).includes(settings.folderFormat)) {
                settings.folderFormat = (FolderFormats as Record<string, string>)[
                    settings.folderFormat
                ];
            }
            repo = new Repository(settings, '');
            await repo.getLocalMetaData(hash);
            await repo.getRemoteMetaData();
            let p = await repo.getRemoteClonePath();
            let remote =
                expectedResults.test_git_04.prefix +
                `${expectedResults.test_git_04.commitDate}_${expectedResults.test_git_04.tag}_` +
                expectedResults.test_git_04.commit.substring(0, 8);
            console.log('     ›', 'Pasta via getRemoteClonePath:', p);
            console.log('     ›', 'Pasta remota esperada:       ', remote);
            assert.ok(p === remote, 'Pasta não conferem');
        } else {
            console.log('     ›', 'Falta este teste no Linux');
        }
    });
});
