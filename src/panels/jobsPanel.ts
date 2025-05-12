import {
    Disposable,
    Webview,
    WebviewPanel,
    window,
    Uri,
    ViewColumn,
    TextDocument,
    env,
    commands,
    ExtensionContext,
    ExtensionMode,
} from 'vscode';
import { getUri } from '../utilities/getURI';
import { getNonce } from '../utilities/getNonce';
import { getJobs, killJob, getUserJobUpdates } from '../jobs';
import { getSettings } from '../settings';
import { JobArrayType, LogOpt, SettingsType } from '../types';
import * as PubSub from 'pubsub-js';
import { expressServer } from '../utilities/proxy';
import { openLog, evaluatePathReverse } from '../utilities/openLog';
import { sendSSHcommand } from '../ssh2';
import { getJobProgress } from '../utilities/getJobProgress';

function generateCommitUrl(hash: string, uri: string): string {
    // Valida se a URI é http/https ou git (SSH)
    const httpRegex = /^(http|https):\/\/([\w.-]+)\/(.+?)(\.git)?$/;
    const sshRegex = /^git@([\w.-]+):(.+?)(\.git)?$/;

    let baseUrl: string;
    let projectPath: string;

    if (httpRegex.test(uri)) {
        const match = uri.match(httpRegex);
        if (!match) {
            throw new Error('URI inválida');
        }
        [, , baseUrl, projectPath] = match;
        baseUrl = `https://${baseUrl}`;
    } else if (sshRegex.test(uri)) {
        const match = uri.match(sshRegex);
        if (!match) {
            throw new Error('URI inválida');
        }
        [, baseUrl, projectPath] = match;
        baseUrl = `https://${baseUrl}`;
    } else {
        throw new Error('Formato de URI desconhecido');
    }

    // Remove a extensão .git do final, se existir
    projectPath = projectPath.replace(/\.git$/, '');

    // Verifica se é GitHub ou GitLab
    if (baseUrl.includes('github.com')) {
        return `${baseUrl}/${projectPath}/commit/${hash}`;
    } else if (baseUrl.includes('gitlab')) {
        return `${baseUrl}/${projectPath}/-/commit/${hash}`;
    } else if (baseUrl.includes('git.ep')) {
        return `${baseUrl}/${projectPath}/-/commit/${hash}`;
    } else {
        throw new Error('Servidor Git não suportado');
    }
}

function getGitServerURL(job: JobArrayType): string {
    if ('comment' in job) {
        const parts = job.comment.split('|');
        if (parts.length === 5) {
            try {
                return generateCommitUrl(parts[3], parts[4]);
            } catch {
                return '';
            }
        }
    }
    return '';
}

/**
 * This class manages the state and behavior of HelloWorld webview panels.
 *
 * It contains all the data and methods for:
 *
 * - Creating and rendering JobsView webview panels
 * - Properly cleaning up and disposing of webview resources when the panel is closed
 * - Setting the HTML (and by proxy CSS/JavaScript) content of the webview panel
 * - Setting message listeners so data can be passed between the webview and extension
 */
export class JobsPanel {
    public static currentPanel: JobsPanel | undefined;
    private readonly _panel: WebviewPanel;
    private _disposables: Disposable[] = [];
    private settings: SettingsType;
    private isProduction: boolean;

    /**
     * The JobsPanel class private constructor (called only from the render method).
     *
     * @param panel A reference to the webview panel
     * @param extensionUri The URI of the directory containing the extension
     */
    private constructor(
        panel: WebviewPanel,
        private extensionUri: Uri,
        private context: ExtensionContext,
    ) {
        this._panel = panel;
        this.settings = getSettings();
        this.isProduction = this.context.extensionMode === ExtensionMode.Production;
        // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
        // the panel or when the panel is closed programmatically)
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Set the HTML content for the webview panel
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);

        // Set an event listener to listen for messages passed from the webview context
        this._setWebviewMessageListener(this._panel.webview);
    }

    /**
     * Renders the current webview panel if it exists otherwise a new webview panel
     * will be created and displayed.
     *
     * @param extensionUri The URI of the directory containing the extension.
     */
    public static render(extensionUri: Uri, context: ExtensionContext) {
        if (JobsPanel.currentPanel) {
            // If the webview panel already exists reveal it
            JobsPanel.currentPanel._panel.reveal(ViewColumn.One);
        } else {
            // If a webview panel does not already exist create and show a new one
            const panel = window.createWebviewPanel(
                // Panel view type
                'showJobs',
                // Panel title
                'Gerenciamento de Jobs',
                // The editor column the panel should be displayed in
                ViewColumn.One,
                // Extra panel configurations
                {
                    // Enable JavaScript in the webview
                    enableScripts: true,
                    enableCommandUris: true,
                    retainContextWhenHidden: true,
                    // Restrict the webview to only load resources from the `out` and `src/webview-ui/public/build` directories
                    localResourceRoots: [
                        Uri.joinPath(extensionUri, 'media'),
                        Uri.joinPath(extensionUri, 'webview'),
                    ],
                },
            );

            JobsPanel.currentPanel = new JobsPanel(panel, extensionUri, context);
        }
    }

    /**
     * Cleans up and disposes of webview resources when the webview panel is closed.
     */
    public dispose() {
        JobsPanel.currentPanel = undefined;

        // Dispose of the current webview panel
        this._panel.dispose();

        // Dispose of all disposables (i.e. commands) for the current webview panel
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    public sendMessage2View(args: Object) {
        this._panel.webview.postMessage(args);
    }
    /**
     * Defines and returns the HTML that should be rendered within the webview panel.
     *
     * @remarks This is also the place where references to the Svelte webview build files
     * are created and inserted into the webview HTML.
     *
     * @param webview A reference to the extension webview
     * @param extensionUri The URI of the directory containing the extension
     * @returns A template string literal containing the HTML that should be
     * rendered within the webview panel
     */
    private _getWebviewContent(webview: Webview, extensionUri: Uri) {
        // The CSS file from the Svelte build output
        const stylesUri = getUri(webview, extensionUri, ['media', 'assets', 'index.css']);
        // The JS file from the Svelte build output

        const nonce = getNonce();

        let scriptUri = null;
        const isProduction = this.context.extensionMode === ExtensionMode.Production;
        if (isProduction) {
            scriptUri = getUri(webview, extensionUri, ['media', 'index.js']);
        } else {
            console.log('Modo de desenvolvimento');
            scriptUri = 'http://localhost:5173/src/main.ts';
        }
        /* proxy */
        const proxyPort = Math.ceil(Math.random() * (44999 - 44001) + 44001);
        expressServer(proxyPort.toString());

        const title = JobsPanel.currentPanel?._panel.title;
        // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
        return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>${title}</title>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src ${webview.cspSource};
            connect-src ${webview.cspSource}  http://localhost:${proxyPort} ws://localhost:5173;
            style-src 'unsafe-inline' ${webview.cspSource};
            script-src 'unsafe-inline' ${webview.cspSource}  http://localhost:5173;">
          <meta name="histSize" content="${this.settings.webviewHistSize}" />
          <meta name="jobsSize" content="${this.settings.webviewJobsSize}" />
          <meta name="user" content="${this.settings.user}" />
          <meta name="account" content="${this.settings.account}" />
          <meta name="proxyPort" content="${proxyPort}" />
          <meta name="route" content="vshpc.jobsviewer" />
          ${isProduction ? `<link rel="stylesheet" type="text/css" href="${stylesUri}"/>` : ''}
          <script defer ${isProduction ? '' : `type="module"`} src="${scriptUri}"></script>
        </head>
        <body>
        <div id="app"></div>
        </body>
      </html>
    `;
    }

    /**
     * Sets up an event listener to listen for messages passed from the webview context and
     * executes code based on the message that is recieved.
     *
     * @param webview A reference to the extension webview
     * @param context A reference to the extension context
     */
    private _setWebviewMessageListener(webview: Webview) {
        webview.onDidReceiveMessage(
            async (message: any) => {
                let winpath = '';
                const command = message.command;
                const info = message.info;
                const payload = message.payload;
                console.log(
                    'jobsPanel->_setWebviewMessageListener->Ondidreceive: ' +
                        JSON.stringify(message),
                );
                let caller = message.caller ?? undefined;
                switch (command) {
                    case 'listJobs':
                        this._askForJobs(payload);
                        break;
                    case 'updateJobs':
                        this._askForUpdateJobs(payload);
                        break;
                    case 'killJobs':
                        if (Array.isArray(message.payload)) {
                            const settings = getSettings();
                            //console.log('Enviando kill para ' + message.payload.join(' '));
                            let ret = await killJob(settings, message.payload.join(' '));
                        }
                        setTimeout(() => {
                            this._askForJobs(payload);
                        }, 4000);
                        break;
                    case 'openLog':
                        let retcode = '400';
                        let retmsg = '';
                        try {
                            retcode = (await openLog(payload)) ? '200' : '400';
                        } catch (e) {
                            const msg = e instanceof Error ? e.message : String(e);
                            retmsg = msg;
                            retcode = '500';
                        }
                        this.sendMessage2View({
                            message: 'openLogRet',
                            code: retcode,
                            caller: caller,
                            extra: retmsg,
                        });
                        break;
                    case 'openUrlLink':
                        console.log('Vou tentar achar ' + Uri.parse(message.args));
                        commands.executeCommand(
                            'simpleBrowser.show',
                            encodeURI(
                                this.settings.customConfig.settings.userSearchSite + message.args,
                            ),
                        );
                        env.openExternal(Uri.parse(message.args));
                        break;
                    case 'openExternalBrowser':
                        console.log('Vou tentar abrir o VAI');
                        // console.log(this.settings.customConfig.settings.externalBrowser + message.args);
                        commands.executeCommand(
                            'vscode.open',
                            Uri.parse(this.settings.customConfig.settings.externalBrowser + message.args),
                        );
                        env.openExternal(Uri.parse(message.args));
                        break;
                    case 'openGitServer':
                        console.log(
                            'Vou tentar achar o git server com estes dados' +
                                JSON.stringify(payload),
                        );
                        const url = getGitServerURL(payload);
                        if (url) {
                            env.openExternal(Uri.parse(url));
                            //commands.executeCommand('simpleBrowser.show', encodeURI(url));
                        }
                    case 'openSystemFolder':
                        winpath = evaluatePathReverse(payload.chdir);
                        commands.executeCommand('revealFileInOS', Uri.parse(winpath));
                        break;
                    case 'openVScodeFolder':
                        winpath = evaluatePathReverse(payload.chdir);
                        commands.executeCommand('vscode.openFolder', Uri.parse(winpath), {
                            forceNewWindow: true,
                            noRecentEntry: true,
                        });
                        break;

                    case 'cmgprogress': {
                        console.log('Informações enviadas o askjobs');
                        this._askForProgress(payload);
                        break;
                    }
                }
            },
            undefined,
            this._disposables,
        );
    }

    private async _askForJobs(payload: any) {
        let ret: JobArrayType[] = [];
        ret = await getJobs(this.settings, payload);
        if (ret.length > 0) {
            this.sendMessage2View({ message: 'jobs', payload: ret });
        } else {
            this.sendMessage2View({
                message: 'info',
                payload: 'Nenhum job encontrado!',
                extra: 'noJobs',
            });
        }
    }

    private async _askForUpdateJobs(payload: any) {
        let ret: JobArrayType[] = [];
        ret = await getUserJobUpdates(this.settings, payload);
        if (ret.length > 0) {
            this.sendMessage2View({ message: 'updateJobs', payload: ret });
        }
    }

    private async _askForProgress(payload: any) {
        if (!payload) {
            console.log('Sem argumentos');
            return;
        }
        const retmsg = await getJobProgress(payload);
        this.sendMessage2View({ message: 'cmgprogress', payload: retmsg ? retmsg : [] });
    }
}
