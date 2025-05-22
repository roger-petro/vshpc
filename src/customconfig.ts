/**
 * Faz a leitura do vshpc.json ou equivalente, que contenha as configurações
 * iniciais para a extensão funcionar. Também ajusta os settings com valores padrão.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as PubSub from 'pubsub-js';
// import axios from 'axios';
// import * as https from 'https';

import { LogOpt, CustomConfig, CustomError, Simulator, APP_NAME, SettingsType } from './types';
import { getSettings } from './settings';
import { scpRead } from './scp2';

export const CUSTOM_CONFIG_NAME = 'vshpc.json';
export const CUSTOM_VERSION = '3';

/**
 * Ajusta alguns settings da extensão no vscode, caso elas não tenham sido
 * ainda ajustados, com base no que foi carregado do customconfig
 * de tal modo que estes valores apareçam na interface
 */
async function adjustSettings(settings: SettingsType) {
    if (Object.keys(settings.customConfig).length > 0) {
        const customConfig = settings.customConfig;
        //privKey uri
        if (settings.privRsaKey === '') {
            let rsafile = customConfig.settings.defaultPrivRSAKey;
            if (process.platform === 'linux') {
                if ('defaultLinuxPrivRSAKey' in customConfig.settings) {
                    rsafile = customConfig.settings.defaultLinuxPrivRSAKey;
                } else {
                    PubSub.publish(
                        LogOpt.toast_error,
                        'Você deve carregar a versão ${} das configurações customizadas. ' +
                            'Fale com o administrado do vsHPC.',
                    );
                }
            }
            settings.privRsaKey = rsafile.replace('{user}', settings.user);
            vscode.workspace
                .getConfiguration(APP_NAME)
                .update('connection.privRsaKey', settings.privRsaKey, true);
        }

        //cluster fqdn
        if (!settings.cluster || settings.cluster === '') {
            settings.cluster = customConfig.settings.defaultCluster;
            vscode.workspace
                .getConfiguration(APP_NAME)
                .update('connection.cluster', settings.cluster, true);
        }

        //folder mappings
        if (Object.keys(settings.pathMapping).length === 0) {
            settings.pathMapping = customConfig.settings.defaultWindowsUnix;
            if (process.platform === 'linux') {
                if ('defaultUnixMapping' in customConfig.settings) {
                    settings.pathMapping = customConfig.settings.defaultUnixMapping;
                } else {
                    PubSub.publish(
                        LogOpt.toast_error,
                        'Você deve carregar a versão ${} das configurações customizadas. ' +
                            'Fale com o administrado do vsHPC.',
                    );
                }
            }
            vscode.workspace
                .getConfiguration(APP_NAME)
                .update('path.WindowsUnix', settings.pathMapping, true);
        }

        //folder format
        if (settings.folderFormat === '') {
            settings.folderFormat = customConfig.settings.defaultFolderFormat;
            vscode.workspace
                .getConfiguration(APP_NAME)
                .update('path.folderFormat', customConfig.settings.defaultFolderFormat, true);
        }
    }
}

/**
 * Cria o comando que irá carregar o customconfig do disco e salvar
 * no globalstorage do usuário. Usualmente em:
 * C:\Users\XXXX\AppData\Roaming\Code\User\globalStorage\<ext-id>
 * @param context
 */
export function setCustomConfigLoadCmds(context: vscode.ExtensionContext) {
    const loadCustomConfig = vscode.commands.registerCommand(
        'rogerio-cunha.vshpc.loadCustomConfiguration',
        async () => {
            try {
                const lastConfigUriString = context.globalState.get<string>('lastConfigUri');
                const lastConfigUri = lastConfigUriString
                    ? vscode.Uri.parse(lastConfigUriString)
                    : undefined;

                const uris = await vscode.window.showOpenDialog({
                    openLabel: 'Selecione o arquivo de configuração JSON',
                    filters: { 'Arquivos JSON': ['json'] },
                    defaultUri: lastConfigUri,
                });

                if (!uris || uris.length === 0) {
                    PubSub.publish(LogOpt.toast, 'Operação cancelada pelo usuário.');
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
                await vscode.workspace.fs.writeFile(
                    configFileUri,
                    Buffer.from(JSON.stringify(customConfig, null, 2), 'utf-8'),
                );

                // Armazenar o último caminho usado
                await context.globalState.update('lastConfigUri', fileUri.toString());

                //importante esta carga ao carregar o config pois assim os valores fundamentais são
                //ajustados para poder ter o cluster configurado
                const settings = await getSettings();
                settings.customConfig = customConfig;
                await adjustSettings(settings);

                PubSub.publish(LogOpt.toast, 'Configurações carregadas com sucesso!');
            } catch (error: any) {
                PubSub.publish(LogOpt.toast, 'Erro ao carregar as configurações: ' + error.message);
            }
        },
    );

    /** Comando para selecionar o simulador via input do VSCODE
     */
    const selectSimulNameDisposable = vscode.commands.registerCommand(
        'rogerio-cunha.vshpc.selectSimulName',
        async () => {
            try {
                // Carregar o customConfig
                const customConfig = (await getSettings()).customConfig;
                if (!customConfig) {
                    PubSub.publish(
                        LogOpt.toast_error,
                        'Configurações personalizadas não carregadas. Por favor, execute o comando "Carregar Configuração Personalizada" primeiro.',
                    );
                    return;
                }

                // Obter solverNames do customConfig
                const solverNames = customConfig.settings?.solverNames;
                if (!solverNames || Object.keys(solverNames).length === 0) {
                    PubSub.publish(
                        LogOpt.toast_error,
                        'Nenhum simulador encontrado nas configurações personalizadas.',
                    );
                    return;
                }

                // Preparar as opções para o QuickPick
                const displayNames = Object.keys(solverNames);

                // Exibir o QuickPick para o usuário
                const selectedDisplayName = await vscode.window.showQuickPick(displayNames, {
                    placeHolder: 'Selecione um simulador',
                });

                if (!selectedDisplayName) {
                    PubSub.publish(LogOpt.toast, 'Operação cancelada pelo usuário.');
                    return;
                }

                // Obter o nome interno correspondente ao displayName selecionado
                //solverNames[selectedDisplayName];

                const scopeOptions = [
                    {
                        label: 'Global (Usuário)',
                        target: vscode.ConfigurationTarget.Global,
                    },
                    { label: 'Workspace', target: vscode.ConfigurationTarget.Workspace },
                ];

                const selectedScope = await vscode.window.showQuickPick(
                    scopeOptions.map(option => option.label),
                    { placeHolder: 'Selecione o escopo para aplicar a configuração' },
                );

                if (!selectedScope) {
                    PubSub.publish(LogOpt.toast, 'Operação cancelada pelo usuário.');
                    return;
                }

                const scope = scopeOptions.find(option => option.label === selectedScope);
                const target = scope?.target || vscode.ConfigurationTarget.Global;

                // Atualizar a configuração 'vshpc.solver.name' com o valor selecionado se mudou o valor

                const globalValue =
                    vscode.workspace.getConfiguration(APP_NAME).inspect('solver.name')
                        ?.globalValue || '';
                const workspaceValue =
                    vscode.workspace.getConfiguration(APP_NAME).inspect('solver.name')
                        ?.workspaceValue || '';
                if (
                    (target === vscode.ConfigurationTarget.Global &&
                        selectedDisplayName !== globalValue) ||
                    (target === vscode.ConfigurationTarget.Workspace &&
                        selectedDisplayName !== workspaceValue)
                ) {
                    await vscode.workspace
                        .getConfiguration(APP_NAME)
                        .update('solver.name', selectedDisplayName, target);
                    const simulator = customConfig.simulators.find(item =>
                        item.solvers.find(sol => sol === solverNames[selectedDisplayName]),
                    ) as Simulator;
                    if (simulator) {
                        await vscode.workspace
                            .getConfiguration(APP_NAME)
                            .update('solver.version', simulator.defaultSolverVersion, target);
                        await vscode.workspace
                            .getConfiguration(APP_NAME)
                            .update('solver.ExtraParams', simulator.defaultSolverExtras, target);

                        try {
                            vscode.window.showInformationMessage(
                                `Simulador selecionado: ${selectedDisplayName}. Reabra a janela para ver as mudanças.`,
                            );
                        } catch {}
                    } else {
                        PubSub.publish(
                            LogOpt.toast_error,
                            'Erro ao indentificar o simulador nas configurações customizadas: ',
                        );
                    }
                }
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                PubSub.publish(LogOpt.toast_error, 'Erro ao selecionar o simulador: ' + msg);
            }
        },
    );

    context.subscriptions.push(selectSimulNameDisposable);

    context.subscriptions.push(loadCustomConfig);
}

/**
 * Lê a configuração customizada ou do globalStorage ou
 * via scp da pasta de bootstrap caso a versão requerida seja
 * maior em relação à presente no globalStorage
 */
export async function getCustomConfig(
    context: vscode.ExtensionContext,
    settings: SettingsType,
    reconf = false,
): Promise<SettingsType> {
    const configFileUri = vscode.Uri.joinPath(context.globalStorageUri, CUSTOM_CONFIG_NAME);

    settings.customConfig = {} as CustomConfig;
    let customConfig = {} as CustomConfig;

    try {
        PubSub.publish(LogOpt.vshpc, `> O customconfig será lido de ${configFileUri}`);
        const fileContent = await vscode.workspace.fs.readFile(configFileUri);
        customConfig = JSON.parse(Buffer.from(fileContent).toString('utf-8'));
    } catch (e) {
        if (!reconf && Object.keys(settings.customConfig).length === 0) {
            PubSub.publish(
                LogOpt.toast,
                `VSHPC: Carregue as configurações da sua empresa. Fale com o administrador/mantendor para obter o arquivo JSON na versão ${CUSTOM_VERSION} e [carregá-las neste comando](command:rogerio-cunha.vshpc.loadCustomConfiguration).`,
            );
        }
        return settings;
    }

    //retorna se a versão lida do arquivo está correta
    if (customConfig && customConfig?.settings && 'version' in customConfig.settings) {
        settings.customConfig = customConfig;
        PubSub.publish(
            LogOpt.vshpc,
            `> O customconfig local está na versão ${customConfig.settings.version}. Desejada:${CUSTOM_VERSION}`,
        );
        if (customConfig.settings.version === CUSTOM_VERSION) {
            await adjustSettings(settings);
            return settings;
        }

        PubSub.publish(LogOpt.vshpc, `> O customconfig será lido via SCP, se existir`);
        const fname = path.parse(CUSTOM_CONFIG_NAME).name;
        const fext = path.parse(CUSTOM_CONFIG_NAME).ext;
        const remote = `${customConfig.settings.remoteBaseScriptDir}/bootstrap/${fname}-${CUSTOM_VERSION}${fext}`;
        PubSub.publish(
            LogOpt.vshpc,
            `> Local remoto: ${remote}`,
        );
        try {
            const streamUTF8 = (await scpRead(
                remote,
                settings.cluster,
                settings.user,
                settings.passwd,
                settings.privRsaKey,
            )) as string;
            const configFromSCP = JSON.parse(streamUTF8.split('\n').join('')) as CustomConfig;

            if (
                configFromSCP &&
                'settings' in configFromSCP &&
                'version' in configFromSCP.settings
            ) {
                settings.customConfig = configFromSCP;
                await adjustSettings(settings);
                const encoder = new TextEncoder();
                await vscode.workspace.fs.writeFile(configFileUri, encoder.encode(JSON.stringify(configFromSCP, null, 2)));
                return settings;
            }
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                PubSub.publish(
                    LogOpt.vshpc,
                    `> O customconfig não foi encontrado em ${configFileUri}`,
                );
            }
        }
    }
    return settings;
}
