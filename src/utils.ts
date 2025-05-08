import * as vscode from 'vscode';
import * as PubSub from 'pubsub-js';
import path from 'path';
import { LogOpt, WorkspaceModelFolder, Simulator, CustomConfig } from './types';
import { checkAccountSettings, getSettings, checkSubmitSettings, setWorkDir } from './settings';
import { evaluatePath } from './path';

/**
 * Retorna o modelo a ser simulado caso o usuário opte pelo menu ou por escolher o dat pela
 * paleta da comandos
 * @param option
 * @param clickedFile: nome do arquivo que foi clicado sobre para abrir o menu de contexto
 * 						no formato vscode para o uri.file
 * @returns
 */
export async function getModelName(clickedFile: vscode.Uri | null) {
    const settings = getSettings();
    const VSHPC = settings.customConfig as CustomConfig;
    let model = '';
    if (clickedFile) {
        /** tenta verificar pelo no do arquivo selecionado ao clicar no explorer view */
        const simulator = VSHPC.simulators.find(item =>
            item.solvers.find(sol => sol === settings.solverName),
        ) as Simulator;
        if (simulator && settings.workdir !== '') {
            //vscode.workspace.workspaceFolders !== undefined) {
            const folder = settings.workdir; //vscode.workspace.workspaceFolders[0].uri.path ;
            //const modfile2 = vscode.workspace.asRelativePath(clickedFile)
            const modfile = clickedFile.fsPath.substring(folder.length + 1).replaceAll('\\', '/');
            if (
                path.extname(modfile) === '.' + simulator.ext ||
                path.extname(modfile) === '.' + simulator.ext.toUpperCase()
            ) {
                //console.log('Modelo que foi selecionado ao clicar :' + modfile + " para o solver:" + settings.solverName);
                model = modfile;
            } else {
                PubSub.publish(
                    LogOpt.vshpc,
                    `> getModelName: o arquivo ${modfile} não foi identificado como um  modelo pela extensão`,
                );
            }
        } else {
            console.log('Não havia um workspace folder aberto?');
        }
    }

    if (!model) {
        model = getOpenedModelName();
        if (!model) {
            const ret = await pickModel();
            if (ret) {
                if (settings.workdir !== vscode.Uri.parse(ret.path).fsPath) {
                    setWorkDir(vscode.Uri.parse(ret.path));
                    return ret.model;
                }
            }
            return ret ? ret.model : '';
        }
    }
    return model;
}

/**
 *
 * @returns Retorna o nome do modelo aberto no editor, prefixado com a pasta
 *          relativa (sem a primeira '/')
 */
export function getOpenedModelName() {
    const settings = getSettings();
    const simulDefs = settings.customConfig.simulators;

    const simulator = simulDefs.find((item: Simulator) =>
        item.solvers.find(sol => sol === settings.solverName),
    );
    if (simulator) {
        let doc = vscode.window.activeTextEditor;
        if (
            simulator &&
            doc &&
            vscode.workspace.workspaceFolders !== undefined &&
            vscode.window.activeTextEditor
        ) {
            const folder = vscode.workspace.getWorkspaceFolder(
                vscode.window.activeTextEditor?.document.uri,
            );
            if (folder) {
                const model = doc.document.uri.path.substring(folder?.uri.path.length + 1);
                if (
                    path.extname(model) === '.' + simulator.ext ||
                    path.extname(model) === '.' + simulator.ext.toUpperCase()
                ) {
                    //console.log("Retornando o modelo:" + model + " na área de trabalho: " + settings.workdir + " para o solver:" + settings.solverName);
                    return model;
                }
            }
        }
    }
    //console.log('Retornando nulo para o model ao comparar ' + ext);
    return '';
}

/**
 * Retorna todos os modelos na pasta corrente
 * @returns Array com todos os modelos nas pastas corrente
 */
export async function pickSiblingModels(uri: vscode.Uri): Promise<string[]> {
    const settings = getSettings();
    const simulDefs = settings.customConfig.simulators;

    if (!checkAccountSettings() || !checkSubmitSettings()) {
        PubSub.publish(
            LogOpt.vshpc,
            `> pickSiblingModels: configurações carregadas: ${JSON.stringify(settings)}`,
        );
        return [];
    }
    let simulator = simulDefs.find((item: Simulator) =>
        item.solvers.find(sol => sol === settings.solverName),
    ) as Simulator;
    if (!simulator) {
        return [];
    }
    const rootFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (rootFolder) {
        let folder = path.dirname(uri.path);
        if (folder[folder.length - 1] === '.') {
            folder = folder.slice(0, -1);
        }
        let subdir = path.dirname(uri.path.substring(rootFolder.uri.path.length + 1)); //+1 para tirar o '/' antes do subdir
        if (subdir === '.') {
            subdir = '';
        } else {
            subdir = subdir + '/';
        }
        const relative = new vscode.RelativePattern(
            rootFolder.uri.fsPath,
            `${subdir}*.{${simulator?.ext},${simulator.ext.toUpperCase()}}`,
        );
        const datFiles = await vscode.workspace.findFiles(relative, undefined);
        let ar: string[] = [];
        for (let _datFile of datFiles) {
            ar.push(_datFile.path.substring(rootFolder.uri.path.length));
        }
        for (let _path of ar) {
            if (_path[0] === '/') {
                _path = _path.substring(1);
            } //retira o primeiro "/"
        }
        return ar;
    }
    return [];
}

export async function pickModel(): Promise<WorkspaceModelFolder | undefined> {
    const settings = getSettings();
    const simulDefs = settings.customConfig.simulators;

    if (!checkAccountSettings() || !checkSubmitSettings()) {
        PubSub.publish(LogOpt.vshpc, `> pickModel: configurações carregadas`);
        return undefined;
    }
    // executa o job

    let simulator = simulDefs.find((item: Simulator) =>
        item.solvers.find(sol => sol === settings.solverName),
    ) as Simulator;
    if (!simulator) {
        vscode.window.showInformationMessage('Especificações para o simulador não encontradas');
        PubSub.publish(LogOpt.vshpc, `> pickModel: Especificação para o simulador não encontrada`);
        return undefined;
    }

    // let curEdit = undefined;
    // if (vscode.window.activeTextEditor)
    // 	curEdit = vscode.window.activeTextEditor.document.uri.path; //captura o arquivo aberto e com foco no editor

    let visibleEdits: string[] = []; //captura os arquivos abertos no editor
    if (vscode.workspace.textDocuments) {
        for (let i in vscode.workspace.textDocuments) {
            let file = vscode.workspace.textDocuments[i].uri.path;
            if (path.extname(file) !== '.' + simulator.ext) {
                continue;
            }
            if (visibleEdits.find(e => e === file) === undefined) {
                visibleEdits.push(vscode.workspace.textDocuments[i].uri.path.toLowerCase());
            }
        }
    }

    //console.debug( `Arquivo com foco: ${curEdit}`);
    //console.debug( `Arquivos abertos: ${visibleEdits}`);

    let datFiles: vscode.Uri[] = [];
    const glob = `**/*.{${simulator.ext},${simulator.ext.toUpperCase()}}` as vscode.GlobPattern;
    await vscode.workspace.findFiles(glob, '**​/node_modules/**').then((value: vscode.Uri[]) => {
        datFiles = value;
        if (value && value.length === 0) {
            PubSub.publish(LogOpt.vshpc, `> pickModel: Nenhum ${simulator.ext} encontrado`);
            PubSub.publish(LogOpt.toast, `Nenhum ${simulator.ext} encontrado`);
            return undefined;
        }
    });

    let modelFolderArr: Array<WorkspaceModelFolder> = [];

    let ar: string[] = [];
    if (vscode.workspace.workspaceFolders) {
        for (let datFile of datFiles) {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(datFile);
            let folderPath = workspaceFolder?.uri.path || '';
            let workspaceNumber = workspaceFolder?.index || 0;

            let model = datFile.path.substring(folderPath.length + 1);
            if (folderPath === '' || model === '') {
                continue;
            }
            if (model[0] === '/') {
                model = model.substring(1);
            }
            if (visibleEdits.includes(datFile.path.toLowerCase())) {
                ar.unshift(`[${workspaceNumber}]: ${model}`);
            } else {
                ar.push(`[${workspaceNumber}]: ${model}`);
            }
            modelFolderArr.push({
                model: model,
                path: folderPath,
                workspaceindex: workspaceNumber,
            });
        }
    } else {
        return;
    }
    // for (const i in ar) {
    // 	if (ar[i][0] === '/') {	ar[i] = ar[i].substring(1);} //retira o primeiro "/"
    // }

    const selection = await vscode.window.showQuickPick(ar, {
        title: 'Modelos (selecione para simular):',
    });

    if (selection) {
        PubSub.publish(LogOpt.vshpc, `> pickModel: Dat selecionado para simular: ${selection}`);
        return modelFolderArr.find(e => `[${e.workspaceindex}]: ${e.model}` === selection);
    } else {
        vscode.window.showErrorMessage(`${simulator.ext} não foi selecionado`);
    }
    return undefined;
}

/**
 * Retorna o hash que o camarada deseja simular
 * @param option
 * @returns
 */
export async function askCommitHash(): Promise<string> {
    let hash = '';
    await vscode.window.showInputBox({ title: 'Entre com hash completo' }).then(specificHash => {
        const regexExp = /^[a-f0-9]{40}$/gi;
        if (specificHash && regexExp.test(specificHash)) {
            hash = specificHash;
            return hash;
        } else {
            PubSub.publish(LogOpt.vshpc, '> getModelName: hash é inválido. Use o hash completo');
        }
    });
    return hash;
}

/**
 * Faz uma verificação dos requisitos para iniciar uma simulação
 * Os testes podem ser ampliados com o tempo
 * @param params
 * @returns
 */
export function checkOptions(params: { models: string[]; hash?: string }) {
    const settings = getSettings();
    const simulDefs = settings.customConfig.simulators;
    let simulator = simulDefs.find((item: Simulator) =>
        item.solvers.find(sol => sol === settings.solverName),
    ) as Simulator;

    if (!settings.account || settings.account.length === 0) {
        PubSub.publish(
            LogOpt.toast_error,
            `Account precisar ser ajustado na caixa de texto 'project' da configuração do vshpc`,
        );
        vscode.commands.executeCommand(`workbench.action.openSettings`, `vshpc.scheduler.slurm`);
        return false;
    }
    if (!settings.solverName || settings.solverName.length === 0) {
        PubSub.publish(LogOpt.toast_error, `Deve ser especificado o solver para rodar a simulação`);
        vscode.commands.executeCommand(`workbench.action.openSettings`, `vshpc.solver.name`);
        return false;
    }
    if (!settings.solverVersion || settings.solverVersion.length === 0) {
        PubSub.publish(
            LogOpt.toast_error,
            `Deve ser especificado a versão do solver para rodar a simulação`,
        );
        vscode.commands.executeCommand(`workbench.action.openSettings`, `vshpc.solver.version`);
        return false;
    }
    if (settings.cluster.search(/^[\w\._-]+$/) === -1) {
        PubSub.publish(LogOpt.toast_error, `Nome do cluster inconsistente`);
        vscode.commands.executeCommand(`workbench.action.openSettings`, `vshpc.connection.cluster`);
        return false;
    }
    for (const model of params.models) {
        const uri = path.join(settings.workdir, model);
        if (model.length === 0) {
            PubSub.publish(LogOpt.toast_error, `Nome do modelo inconsistente`);
            return false;
        }
        if (uri.search(/\s+/) > -1) {
            PubSub.publish(
                LogOpt.toast_error,
                `Nomes de modelos ou caminhos com espaço não funcionam no cluster`,
            );
            return false;
        }

        if (evaluatePath(settings, uri) === null) {
            PubSub.publish(
                LogOpt.toast_error,
                `Configure antes o "de-para" de modo a acomodar o caminho ${model}`,
            );
            vscode.commands.executeCommand(
                `workbench.action.openSettings`,
                `vshpc.path.WindowsUnix`,
            );
            return false;
        }
    }
    if (params.hash) {
        if (params.hash.length !== 40) {
            PubSub.publish(LogOpt.toast_error, `Tamanho do hash inconsistente`);
            return false;
        }
    }
    if (settings.solverCores === 1) {
        PubSub.publish(LogOpt.dismissable, {
            message: `Sua simulação está rodando com apenas 1 core.`,
            callback: () => {
                vscode.commands.executeCommand(
                    `workbench.action.openSettings`,
                    `vshpc.solver.scheduler.cores`,
                );
            },
        });
    }
    return true;
}
