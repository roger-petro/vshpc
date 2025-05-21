import * as vscode from 'vscode';
import * as PubSub from 'pubsub-js';
import path from 'path';
import { LogOpt, WorkspaceModelFolder, Simulator, CustomConfig } from './types';
import { checkAccountSettings, getSettings, checkSubmitSettings } from './settings';
import { evaluatePath } from './path';

const SUPPORTED = ['.dat', '.gdt', '.geo', '.DATA', '.xml'];

/**
 * Retorna uma lista de vscode.uri abertos no editor caso multiplas simulações, ou
 * a lista de arquivos selecionados no explorer, ou
 * ou arquivo no editor uma vez que se clique no ícone do context/menu, ou
 * o prórpio arquivo aberto quando usando o menu
 * @param uri
 * @param filesOrContext
 * @returns
 */
export async function getFileList(
    uri: vscode.Uri | undefined,
    filesOrContext: any,
): Promise<Array<vscode.Uri>> {
    const isMenuContext =
        filesOrContext && typeof filesOrContext === 'object' && 'groupId' in filesOrContext;

    //se a posiçao no array for undefined, caberá ao pickModel uma seleção
    let files: Array<vscode.Uri> = isMenuContext ? [] : filesOrContext ? filesOrContext : [];

    /** o pedido veio do botão */
    if (!uri && files.length === 0 && isMenuContext) {
        //com o menu de botões no editor, deve-se buscar o arquivo aberto no editor
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const candidate = editor.document.uri;
            const ext = path.extname(candidate.fsPath);
            if (SUPPORTED.includes(ext)) {
                files.push(candidate);
                return files;
            }
        }
    }
    /** quando o comando vem do menu de contexto do explorer o arquivo aparence
     * tanto indicado na uri quanto no files.
     */
    if (uri && !files.find(e => e?.fsPath === uri.fsPath)) {
        files.push(uri);
    }

    if (files.length === 0) {
        const ret = await pickModel();
        if (ret) {
            files.push(ret.uri);
        }
    }

    return files;
}

/**
 * Retorna o nome do modelo a ser simulado com base na seleção feita pelo
 * usuário na interface
 * @param option
 * @param clickedFile: nome do arquivo que foi clicado sobre para abrir o menu de contexto
 * 						no formato vscode para o uri.file
 * @returns
 */
export async function getModelName(clickedFile: vscode.Uri | undefined) {
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
            //const modfile = clickedFile.fsPath.substring(folder.length + 1).replaceAll('\\', '/');
            let modfile = path.relative(folder, clickedFile.fsPath);
            modfile = modfile.replace(/\\/g, '/');

            const ext = path.extname(modfile).toLowerCase();
            if (ext === `.${simulator.ext.toLowerCase()}`) {
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

/**
 * Apresenta uma seleção de modelos num pick, especialmente
 * se a simulação for demandada pelo command palete,
 * considerando a possibilidade de um workspace com multiplas
 * pastas abertas (vários modelos abertos ao mesmo tempo, cada
 * qual controlado por git ou não)
 * @returns
 */
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
                uri: datFile,
            });
        }
    } else {
        return;
    }

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

    if (!['geomec', 'igeo', 'test'].includes(simulator.name)) {
        if (!settings.account || settings.account.length === 0) {
            PubSub.publish(
                LogOpt.toast_error,
                `Account precisar ser ajustado na caixa de texto 'project' da configuração do vshpc`,
            );
            vscode.commands.executeCommand(
                `workbench.action.openSettings`,
                `vshpc.scheduler.slurm`,
            );
            return false;
        }
    }

    // if (['geomec', 'igeo'].includes(simulator.name)) {
    //     if (settings.partition === '') {
    //         PubSub.publish(
    //             LogOpt.toast_error,
    //             `A partição precisa ser ajusta com -p <nome_partição_cluter>`,
    //         );
    //         vscode.commands.executeCommand(
    //             `workbench.action.openSettings`,
    //             `vshpc.scheduler.slurm`,
    //         );
    //         return false;
    //     }
    // }
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
