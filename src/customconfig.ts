/**
 * Faz a leitura do vshpc.json ou equivalente, que contenha as configurações
 * iniciais para a extensão funcionar. Também ajusta os settings com valores padrão.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as PubSub from 'pubsub-js';

import { LogOpt, CustomConfig, CustomError, Simulator, APP_NAME } from './types';
import { getSettings } from './settings';

const CUSTOM_CONFIG_NAME = 'vshpc.json';


async function adjustSettings(context: vscode.ExtensionContext) {
    const settings = getSettings();
    const customConfig = await getCustomConfig(context);
    if (settings.privRsaKey === "") {
        settings.privRsaKey = customConfig.settings.defaultPrivRSAKey.replace("{user}", settings.user);
        vscode.workspace.getConfiguration(APP_NAME).update("connection.privRsaKey", settings.privRsaKey, true);
    }
    if (!settings.cluster || settings.cluster === "") {
        settings.cluster = customConfig.settings.defaultCluster;
        vscode.workspace.getConfiguration(APP_NAME).update("connection.cluster", settings.cluster, true);
    }
    if (Object.keys(settings.windowsUnix).length === 0) {
        settings.windowsUnix = customConfig.settings.defaultWindowsUnix;
        vscode.workspace.getConfiguration(APP_NAME).update("path.WindowsUnix", settings.windowsUnix, true);
    }
    if (settings.folderFormat === "") {
        settings.folderFormat = customConfig.settings.defaultFolderFormat;
        vscode.workspace.getConfiguration(APP_NAME).update("path.folderFormat", customConfig.settings.defaultFolderFormat, true);
    }
}

/**
 * Cria o comando que irá carregar o customconfig e salvar
 * no globalstorage do usuário. Usualmente em:
 * C:\Users\XXXX\AppData\Roaming\Code\User\globalStorage\rogerio-cunha.vshpc
 * @param context
 */
export function setCustomConfigLoadCmds(context: vscode.ExtensionContext) {
    const loadCustomConfig = vscode.commands.registerCommand('rogerio-cunha.vshpc.loadCustomConfiguration', async () => {
        try {
            const lastConfigUriString = context.globalState.get<string>('lastConfigUri');
            const lastConfigUri = lastConfigUriString ? vscode.Uri.parse(lastConfigUriString) : undefined;

            const uris = await vscode.window.showOpenDialog({
                openLabel: 'Selecione o arquivo de configuração JSON',
                filters: { 'Arquivos JSON': ['json'] },
                defaultUri: lastConfigUri
            });

            if (!uris || uris.length === 0) {
                vscode.window.showInformationMessage('Operação cancelada pelo usuário.');
                return;
            }

            const fileUri = uris[0];

            // Ler o conteúdo do arquivo JSON
            const fileContent = await vscode.workspace.fs.readFile(fileUri);
            const customConfig = JSON.parse(Buffer.from(fileContent).toString('utf-8'));

            // Salvar o JSON no diretório de armazenamento global da extensão
            const storagePath = context.globalStorageUri;
            await vscode.workspace.fs.createDirectory(storagePath);

            const configFileUri = vscode.Uri.joinPath(storagePath, CUSTOM_CONFIG_NAME);
            await vscode.workspace.fs.writeFile(configFileUri, Buffer.from(JSON.stringify(customConfig, null, 2), 'utf-8'));

            // Armazenar o último caminho usado
            await context.globalState.update('lastConfigUri', fileUri.toString());

            vscode.window.showInformationMessage('Configurações carregadas com sucesso!');

            adjustSettings(context);

        } catch (error: any) {
            vscode.window.showErrorMessage('Erro ao carregar as configurações: ' + error.message);
        }
    });

    // Comando para selecionar o simulador
    const selectSimulNameDisposable = vscode.commands.registerCommand('rogerio-cunha.vshpc.selectSimulName', async () => {
        try {
            // Carregar o customConfig
            const customConfig = await getCustomConfig(context) as CustomConfig;
            if (!customConfig) {
                vscode.window.showErrorMessage('Configurações personalizadas não carregadas. Por favor, execute o comando "Carregar Configuração Personalizada" primeiro.');
                return;
            }

            // Obter solverNames do customConfig
            const solverNames = customConfig.settings?.solverNames;
            if (!solverNames || Object.keys(solverNames).length === 0) {
                vscode.window.showErrorMessage('Nenhum simulador encontrado nas configurações personalizadas.');
                return;
            }

            // Preparar as opções para o QuickPick
            const displayNames = Object.keys(solverNames);

            // Exibir o QuickPick para o usuário
            const selectedDisplayName = await vscode.window.showQuickPick(displayNames, {
                placeHolder: 'Selecione um simulador'
            });

            if (!selectedDisplayName) {
                vscode.window.showInformationMessage('Operação cancelada pelo usuário.');
                return;
            }

            // Obter o nome interno correspondente ao displayName selecionado
            //solverNames[selectedDisplayName];

            const scopeOptions = [
                { label: 'Global (Usuário)', target: vscode.ConfigurationTarget.Global },
                { label: 'Workspace', target: vscode.ConfigurationTarget.Workspace }
            ];

            const selectedScope = await vscode.window.showQuickPick(
                scopeOptions.map(option => option.label),
                { placeHolder: 'Selecione o escopo para aplicar a configuração' }
            );

            if (!selectedScope) {
                vscode.window.showInformationMessage('Operação cancelada pelo usuário.');
                return;
            }

            const scope = scopeOptions.find(option => option.label === selectedScope);
            const target = scope?.target || vscode.ConfigurationTarget.Global;

            // Atualizar a configuração 'vshpc.solver.name' com o valor selecionado se mudou o valor

            const globalValue = vscode.workspace.getConfiguration(APP_NAME).inspect('solver.name')?.globalValue || "";
            const workspaceValue = vscode.workspace.getConfiguration(APP_NAME).inspect('solver.name')?.workspaceValue || "";
            if ((target===vscode.ConfigurationTarget.Global && selectedDisplayName!==globalValue)||
            (target===vscode.ConfigurationTarget.Workspace && selectedDisplayName!==workspaceValue)){
                await vscode.workspace.getConfiguration(APP_NAME).update('solver.name', selectedDisplayName, target);
                const simulator = customConfig.simulators.find(item=>item.solvers.find(sol=> sol === solverNames[selectedDisplayName])) as Simulator;
                if (simulator) {
                    await vscode.workspace.getConfiguration(APP_NAME).update('solver.version', simulator.defaultSolverVersion, target);
                    await vscode.workspace.getConfiguration(APP_NAME).update('solver.ExtraParams', simulator.defaultSolverExtras, target);
                } else {
                    vscode.window.showErrorMessage('Erro ao indentificar o simulador nas configurações customizadas: ');
                }
                vscode.window.showInformationMessage('As configurações foram atualizadas. Por favor, recarregue a janela para aplicar as mudanças.', 'Recarregar')
                    .then(selection => {
                        if (selection === 'Recarregar') {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                        }
                    });
                }
            } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage('Erro ao selecionar o simulador: ' + msg);
        }
    });

    context.subscriptions.push(selectSimulNameDisposable);

    context.subscriptions.push(loadCustomConfig);
}


export async function getCustomConfig(context: vscode.ExtensionContext): Promise<any> {
    try {
        const configFileUri = vscode.Uri.joinPath(context.globalStorageUri, CUSTOM_CONFIG_NAME);
        PubSub.publish(LogOpt.vshpc, `> O customconfig será lido de ${configFileUri}`);
        const fileContent = await vscode.workspace.fs.readFile(configFileUri);
        const customConfig = JSON.parse(Buffer.from(fileContent).toString('utf-8'));
        return customConfig;
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage('Você precisa carregar as configurações aplicadas à sua empresa. Fale com o administrador/mantendor da aplicação para obter o arquivo de configuração para [carregá-las neste comando](command:rogerio-cunha.vshpc.loadCustomConfiguration).');
        return null;
    }
}

/**
 * Carrega do arquivo de descrito em CUSTOM_CONFIG_NAME, caso futuramente queira ler direto
 * do arquivo ao invés de salvar no globalStorage
 * @returns CustomConfig
 */
export function getCustomConfigDirect(context: vscode.ExtensionContext) {

    let uri = vscode.workspace.getConfiguration(APP_NAME).get("configuration.customConfigURI", "").trim();

    if (!uri || !fs.existsSync(uri)) {
        uri = path.join(require('os').homedir(), CUSTOM_CONFIG_NAME);
        if (!fs.existsSync(uri)) {
            uri = path.join(context.extensionPath, CUSTOM_CONFIG_NAME);
            if (!fs.existsSync(uri)) {
                vscode.window.showErrorMessage(`${CUSTOM_CONFIG_NAME} não encontrado.`);
                throw new CustomError('Custom config não foi econtrado nos locais de procura');
            }
        }
    }
    let rawData = '';
    try {
        rawData = fs.readFileSync(uri, 'utf-8');
        PubSub.publish(LogOpt.vshpc, `> ${CUSTOM_CONFIG_NAME} carregado da origem ${uri}`);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Erro ao carregar ${uri}: ` + error.message);
        throw new CustomError('Custom config não foi econtrado');
    }
    return JSON.parse(rawData) as CustomConfig;
}


