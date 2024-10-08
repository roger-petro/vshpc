import * as vscode from 'vscode';

import * as path from 'path';
import * as fs from 'fs';

import { LogOpt, CustomConfig, CustomError } from './types';

const CUSTOM_CONFIG_NAME = 'reshpc.json';

/**
 * Cria o comando que irá carregar o customconfig e salvar
 * no globalstorage do usuário. Usualmente em:
 * C:\Users\XXXX\AppData\Roaming\Code\User\globalStorage\rogerio-cunha.reshpc
 * @param context
 */
export function customConfigLoad(context: vscode.ExtensionContext) {
    const loadCustomConfig = vscode.commands.registerCommand('reshpc.loadCustomConfiguration', async () => {
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

            const configFileUri = vscode.Uri.joinPath(storagePath, 'customConfig.json');
            await vscode.workspace.fs.writeFile(configFileUri, Buffer.from(JSON.stringify(customConfig, null, 2), 'utf-8'));

            // Armazenar o último caminho usado
            await context.globalState.update('lastConfigUri', fileUri.toString());

            vscode.window.showInformationMessage('Configurações carregadas com sucesso!');
        } catch (error: any) {
            vscode.window.showErrorMessage('Erro ao carregar as configurações: ' + error.message);
        }
    });

    // Comando para selecionar o simulador
    const selectSimulNameDisposable = vscode.commands.registerCommand('reshpc.selectSimulName', async () => {
        try {
            // Carregar o customConfig
            const customConfig = await getCustomConfig(context);
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
            const selectedInternalName = selectedDisplayName; //solverNames[selectedDisplayName];

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

            const target = scopeOptions.find(option => option.label === selectedScope)?.target || vscode.ConfigurationTarget.Global;

            // Atualizar a configuração 'reshpc.solver.name' com o valor selecionado
            const config = vscode.workspace.getConfiguration('reshpc.solver');
            await config.update('name', selectedInternalName, target);

            vscode.window.showInformationMessage(`Simulador '${selectedDisplayName}' selecionado com sucesso.`);
        } catch (error: any) {
            vscode.window.showErrorMessage('Erro ao selecionar o simulador: ' + error.message);
        }
    });

    context.subscriptions.push(selectSimulNameDisposable);

    context.subscriptions.push(loadCustomConfig);
}


export async function getCustomConfig(context: vscode.ExtensionContext): Promise<any> {
    try {
        const configFileUri = vscode.Uri.joinPath(context.globalStorageUri, 'customConfig.json');
        const fileContent = await vscode.workspace.fs.readFile(configFileUri);
        const customConfig = JSON.parse(Buffer.from(fileContent).toString('utf-8'));
        return customConfig;
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage('Erro ao ler as configurações personalizadas: ' + msg);
        return null;
    }
}

/**
 * Carrega do arquivo de descrito em CUSTOM_CONFIG_NAME
 * @returns CustomConfig
 */
export function getCustomConfigDirect(context: vscode.ExtensionContext) {

    let uri = vscode.workspace.getConfiguration("reshpc").get("configuration.customConfigURI", "").trim();

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


