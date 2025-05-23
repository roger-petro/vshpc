// Módulo principal com os comandos do VSCode
import * as vscode from 'vscode';
import * as PubSub from 'pubsub-js';

import { encrypt } from './crypto';
import { sendSSHcommand } from './ssh2';
import { JobArrayType, LogOpt, SubmitOption, APP_NAME, SettingsType } from './types';
import {
    checkAccountSettings,
    setSettings,
    getSettings,
    setWorkDir,
    loadSettings,
    getBasicSettings,
} from './settings';
import { createMessageHub } from './messagehub';
import { jobQueueArray, formatJobs, Consumer } from './jobs';
import {
    pickSiblingModels,
    getModelName,
    checkOptions,
    askCommitHash,
    getOpenedModelName,
    pickModel,
    getFileList,
} from './utils';
import { precheck, check, formattedSettings } from './settingscheck';
import { JobsPanel } from './panels/jobsPanel';

const PKG = require('../package.json');

import { getCurrentHash } from './git';
import { setCustomConfigLoadCmds } from './customconfig';
import { setWalkthroughsCmds } from './walkthrought';
import { setJobTestCmd } from './testjob';
import path from 'path';
import { ExtensionContext } from 'vscode';

let currentJobs: JobArrayType[] = [];

/** retornar o contexto para uso nos testes unitários */
let extensionContext: vscode.ExtensionContext;

export interface ExtensionAPI {
    readonly context: ExtensionContext;
}

export async function activate(context: vscode.ExtensionContext) {
    extensionContext = context;

    const vshpcLog = vscode.window.createOutputChannel('vsHPC Log');

    createMessageHub(vshpcLog);

    PubSub.publish(LogOpt.vshpc, '> activate: Extensão "vshpc" está ativa!');

    if (context.extensionMode === vscode.ExtensionMode.Production) {
        PubSub.publish(LogOpt.vshpc, '> activate: Modo de execução ajustado para produção');
    } else if (context.extensionMode === vscode.ExtensionMode.Test) {
        PubSub.publish(LogOpt.vshpc, '> activate: Modo de execução ajustado para teste');
    } else if (context.extensionMode === vscode.ExtensionMode.Development) {
        PubSub.publish(LogOpt.vshpc, '> activate: Modo de execução ajustado para Desenvolvimento');
    } else {
        PubSub.publish(LogOpt.vshpc, '> activate: Modo de execução não determinado');
    }

    //consumidor da fila de envio de jobs, considerando que cada envio não pode
    //sobrepor o outro

    const consumer = new Consumer();

    if (vscode.window.activeTextEditor) {
        setWorkDir(vscode.window.activeTextEditor.document.uri);
    } else {
        setWorkDir(undefined);
    }

    setCustomConfigLoadCmds(context);
    setWalkthroughsCmds(context);
    setJobTestCmd(context);

    let settings: SettingsType;
    settings = await loadSettings(context, false);

    PubSub.publish(
        LogOpt.vshpc,
        `> activate: Novas configurações carregadas e custom config está na versão ${
            Object.keys(settings.customConfig).length > 0 ? settings.customConfig.settings.version : '????'
        }`,
    );
    vscode.workspace.onDidChangeConfiguration(async () => {
        settings = await loadSettings(context, true);
        PubSub.publish(LogOpt.vshpc, 'Configurações recarregadas e ' + 
            `custom config está na versão ${
            Object.keys(settings.customConfig).length > 0 ? settings.customConfig.settings.version : '????' }`
        );
    });

    vscode.workspace.onDidOpenTextDocument(e => {
        if (e.uri && e.uri.scheme === 'file') {
            const uri = e.uri;
            setWorkDir(uri);
        }
    });

    vscode.window.onDidChangeActiveTextEditor(e => {
        if (e) {
            const doc = e?.document.uri;
            if (vscode.workspace.getWorkspaceFolder(doc)) {
                setWorkDir(doc);
            }
        }
    });

    const jobsSchema = 'jobsSchema';
    const settingsSchema = 'settingsSchema';

    // para listar os jobs no formato antigo
    const jobsEditorProvider = new (class implements vscode.TextDocumentContentProvider {
        onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
        onDidChange = this.onDidChangeEmitter.event;
        provideTextDocumentContent(uri: vscode.Uri): string {
            const settings = getBasicSettings();
            //PubSub.publish(LogOpt.toast,`URI recebida ${uri} vai ser comparada com ${vscode.Uri.parse('jobsSchema:Jobs' )}`);
            if (uri.path === vscode.Uri.parse('jobsSchema:Jobs').path) {
                return formatJobs(currentJobs);
            }
            return 'Esquema não encontrado';
        }
    })();

    //para listar o settings
    const settingsEditorProvider = new (class implements vscode.TextDocumentContentProvider {
        onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
        onDidChange = this.onDidChangeEmitter.event;
        provideTextDocumentContent(uri: vscode.Uri): string {
            const settings = getBasicSettings();
            if (uri.path === vscode.Uri.parse('settingsSchema:Configurações').path) {
                return formattedSettings;
            }
            return 'Esquema não encontrado';
        }
    })();

    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider(jobsSchema, jobsEditorProvider),
    );
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider(
            settingsSchema,
            settingsEditorProvider,
        ),
    );

    const openConfig = vscode.commands.registerCommand(
        'rogerio-cunha.vshpc.openAdvancedConfig',
        async () => {
            const uri = context.globalStorageUri.with({
                path: context.globalStorageUri.path + '/vshpc.json',
            });
            try {
                // tenta abrir se já existir
                const doc = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(doc, { preview: false });
            } catch {}
        },
    );

    /**
     * submeter um job diretamente sem fazer clone, nem mesmo precisando de git
     */

    let jobSubmitDirect = vscode.commands.registerCommand(
        'rogerio-cunha.vshpc.jobSubmitDirect',
        async function (uri: vscode.Uri | undefined, filesOrContext?: any) {
            const files = await getFileList(uri, filesOrContext);
            if (!files || files.length === 0) {
                return '404';
            }
            for (let file of files) {
                setWorkDir(file);
                const model = await getModelName(file);
                if (checkOptions({ models: [model] })) {
                    //console.log('Passou com nome de model '+ model);
                    jobQueueArray.push({
                        model: model,
                        submitOption: SubmitOption.direct,
                        specificHash: null,
                    });
                    consumer.notify();
                }
            }
        },
    );

    /**
     * submeter um job fazendo um checkout de um commit específico
     */
    let jobSubmitHash = vscode.commands.registerCommand(
        'rogerio-cunha.vshpc.jobSubmitHash',
        async function (uri: vscode.Uri | undefined, filesOrContext?: any) {
            const hash = await askCommitHash();
            if (!hash) {
                PubSub.publish(LogOpt.toast, 'Hash inválido');
                return;
            }
            const files = await getFileList(uri, filesOrContext);
            if (!files || files.length === 0) {
                return '404';
            }
            for (let file of files) {
                setWorkDir(file);
                const model = await getModelName(file);
                if (checkOptions({ models: [model], hash: hash })) {
                    jobQueueArray.push({
                        model: model,
                        submitOption: SubmitOption.git,
                        specificHash: hash,
                    });
                    consumer.notify();
                } else {
                    PubSub.publish(LogOpt.toast, 'Hash ou nome inválidos');
                }
            }
        },
    );

    /**
     * submeter jobs com git
     */
    let jobSubmit = vscode.commands.registerCommand(
        'rogerio-cunha.vshpc.jobSubmit',
        async function (uri: vscode.Uri | undefined, filesOrContext?: any) {
            const files = await getFileList(uri, filesOrContext);
            if (!files || files.length === 0) {
                return '404';
            }
            for (let file of files) {
                setWorkDir(file);
                let specificHash = (await getCurrentHash(settings.workdir)) || null;
                const model = await getModelName(file);
                if (checkOptions({ models: [model] })) {
                    jobQueueArray.push({
                        model: model,
                        submitOption: SubmitOption.git,
                        specificHash: specificHash,
                    });
                    consumer.notify();
                }
            }
        },
    );

    /**
     * submeter um job para cada arquivo dat do diretório corrente
     */
    let jobSubmitAll = vscode.commands.registerCommand(
        'rogerio-cunha.vshpc.jobSubmitAll',
        async function (uri: vscode.Uri) {
            setWorkDir(uri);
            let specificHash = (await getCurrentHash(settings.workdir)) || null;
            //console.log(JSON.stringify(uri));
            const models = await pickSiblingModels(uri);
            //console.log(`Modelos detectados irmãos: ${models}`);
            if (checkOptions({ models: models })) {
                for (let i in models) {
                    //SubmitOption.all parece não fazer mais sentido
                    jobQueueArray.push({
                        model: models[i],
                        submitOption: SubmitOption.git,
                        specificHash: specificHash,
                    });
                }
                consumer.notify();
            }
        },
    );

    /**
     * submeter um job com 1 step apenas
     */
    let jobSubmitDirectOneStep = vscode.commands.registerCommand(
        'rogerio-cunha.vshpc.jobSubmitDirectOneStep',
        async function (uri: vscode.Uri | undefined, filesOrContext?: any) {
            const files = await getFileList(uri, filesOrContext);
            if (!files || files.length === 0) {
                return '404';
            }
            for (let file of files) {
                setWorkDir(file);
                const model = await getModelName(file);
                if (checkOptions({ models: [model] })) {
                    //console.log('Passou com nome de model '+ model);
                    jobQueueArray.push({
                        model: model,
                        submitOption: SubmitOption.oneStep,
                        specificHash: null,
                    });
                    consumer.notify();
                }
            }
        },
    );

    /**
     * submeter um job apenas para checar a sintaxe
     */
    let jobSubmitDirectCheck = vscode.commands.registerCommand(
        'rogerio-cunha.vshpc.jobSubmitDirectCheck',
        async function (uri: vscode.Uri | undefined, filesOrContext?: any) {
            const files = await getFileList(uri, filesOrContext);
            if (!files || files.length === 0) {
                return '404';
            }
            for (let file of files) {
                setWorkDir(file);
                const model = await getModelName(file);
                if (checkOptions({ models: [model] })) {
                    //console.log('Passou com nome de model '+ model);
                    jobQueueArray.push({
                        model: model,
                        submitOption: SubmitOption.check,
                        specificHash: null,
                    });
                    consumer.notify();
                }
            }
        },
    );

    const jobsMgmt = vscode.commands.registerCommand('rogerio-cunha.vshpc.jobsMgmt', () => {
        JobsPanel.render(context.extensionUri, context);
    });

    let checkSettings = vscode.commands.registerCommand(
        'rogerio-cunha.vshpc.checkSettings',
        async function () {
            const include = '**/*.{dat,DATA,gdt,geo}';
            const exclude = undefined; // nenhum folder a excluir
            const maxResults = 1; // já para ao achar o primeiro

            const files = await vscode.workspace.findFiles(include, exclude, maxResults);
            if (files.length === 0) {
                if (settings.solverName.length < 2) {
                    PubSub.publish(
                        LogOpt.toast,
                        'Para realizar os testes completos da extensão abra primeiro um folder com seu modelo de simulação',
                    );
                    return false;
                }
                return;
            }
            setWorkDir(files[0]);
            vscode.commands.executeCommand('workbench.action.splitEditorRight').then(() => {
                vscode.commands
                    .executeCommand('workbench.action.focusRightGroup')
                    .then(async () => {
                        const uri = vscode.Uri.parse('settingsSchema:Configurações');

                        precheck();
                        const doc = await vscode.workspace.openTextDocument(uri);
                        await vscode.window.showTextDocument(doc, { preview: false });
                        settingsEditorProvider.onDidChangeEmitter.fire(uri); //coloca o texto que estiver já em "formattedSettings"
                        await check();
                        settingsEditorProvider.onDidChangeEmitter.fire(uri); //coloca todo o texto que estiver em "formattedSettings"
                    });
            });
        },
    );

    let jobCheckSSH = vscode.commands.registerCommand(
        'rogerio-cunha.vshpc.jobCheckSSH',
        async function () {
            const settings = getBasicSettings();
            if (!checkAccountSettings()) {
                return;
            }
            PubSub.publish(
                LogOpt.vshpc,
                `> jobCheckSSH: chamado com ${settings.cluster}, ${settings.user}, ********`,
            );
            let ret = await sendSSHcommand(
                'pwd',
                [''],
                settings.cluster,
                settings.user,
                settings.passwd,
                settings.privRsaKey,
            );
            if (ret) {
                PubSub.publish(
                    LogOpt.vshpc,
                    `> jobCheckSSH: Valor retornado: Código:` +
                        ` ${ret.code}, Mensagem :${ret.stdout}, Erro: ${
                            ret.code !== 0
                                ? ret.stderr
                                    ? ret.stderr
                                    : ret.stdout
                                : 'sem mensagem extra'
                        }`,
                );
            }
            if (ret && ret.code === 0) {
                PubSub.publish(LogOpt.toast, 'SSH para o host está OK!');
                return '200';
            }
            if (ret && ret.code !== 0) {
                vscode.window.showErrorMessage(
                    'SSH está com erro, verifique as configurações de conexão.',
                );
            }
            return '404';
        },
    );

    /**
     * Job de teste enviando +- conforme devem ser os demais casos
     */
    let jobEnterPassword = vscode.commands.registerCommand(
        'rogerio-cunha.vshpc.jobEnterPassword',
        async function () {
            const settings = getBasicSettings();
            vscode.window
                .showInputBox({
                    title: 'Password',
                    prompt: 'Entre com sua password',
                    password: true,
                    placeHolder: '<windows password>',
                })
                .then(async function (value) {
                    if (value) {
                        let enc = encrypt(value);
                        await vscode.workspace
                            .getConfiguration(APP_NAME)
                            .update('connection.password', enc, true);
                        setSettings('passwd', enc);
                    }
                });
        },
    );

    let curVersion = vscode.commands.registerCommand('rogerio-cunha.vshpc.version', function () {
        if ('version' in PKG) {
            PubSub.publish(LogOpt.toast, `Versão: ${PKG.version}`);
            return PKG.version;
        }
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('rogerio-cunha.vshpc.logs', () => {
            vshpcLog.show(); // Exibe o canal de saída no painel Output
        }),
    );

    let selectSimulVersion = vscode.commands.registerCommand(
        'rogerio-cunha.vshpc.selectSimulVersion',
        function () {},
    );

    context.subscriptions.push(jobSubmit);
    context.subscriptions.push(jobSubmitHash);
    context.subscriptions.push(jobSubmitDirect);
    context.subscriptions.push(jobSubmitDirectOneStep);
    context.subscriptions.push(jobSubmitDirectCheck);
    context.subscriptions.push(jobSubmitAll);
    context.subscriptions.push(jobsMgmt);
    context.subscriptions.push(jobCheckSSH);
    context.subscriptions.push(checkSettings);
    context.subscriptions.push(jobEnterPassword);
    context.subscriptions.push(curVersion);
    context.subscriptions.push(selectSimulVersion);
    context.subscriptions.push(openConfig);
}

export function deactivate() {}

export function getExtensionContext(): vscode.ExtensionContext {
    if (!extensionContext) {
        throw new Error('Extensão ainda não foi ativada');
    }
    return extensionContext;
}
