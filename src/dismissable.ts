import * as vscode from "vscode";

/*
Função para mostrar uma mensagem de informação na tela para o usuário
capaz de ter uma opção para mais detalhes e um temporizador para se autodesligar
baseado em https://www.eliostruyf.com/creating-timer-dismissable-notifications-visual-studio-code-extension/
*/

const sleep = (time: number) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, time);
    });
};

/**
 * Abre uma mensagem na tela do vscode em lugar do showInformationMessage
 * capaz de mostrar uma barra de evolução e capaz de chamar um callback
 * caso o usuário clique em detalhes.
 * @param message mensagem que será mostrada
 * @param callback função que será chamada se o usuário clicar em "Detalhe"
 */
export function dismiss(message: string = "Please wait....", callback: Function, timeout=10000, labelString = "Detalhe") {
    //const commandId = "vshpc.undo";
    const commandId  = 'vshpc.exec-' + Math.ceil(Math.random() * (9999 - 1000) + 1000);
    let customCancellationToken: vscode.CancellationTokenSource | null = null;
    const disp = vscode.commands.registerCommand(commandId, () => {
        callback();
        if (customCancellationToken) {
            customCancellationToken.cancel();
        }
    });

    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            cancellable: false,
        },
        async (progress, _token) => {
            return new Promise(async (resolve) => {
                customCancellationToken = new vscode.CancellationTokenSource();

                customCancellationToken.token.onCancellationRequested(() => {
                    customCancellationToken?.dispose();
                    customCancellationToken = null;
                    //vscode.window.showInformationMessage("Cancelled the progress");
                    disp.dispose();
                    resolve(null);
                    return;
                });
                const seconds = timeout/1000;
                for (let i = 0; i < seconds; i++) {
                    // Increment is summed up with the previous value
                    progress.report({ increment: seconds, message: `${message} [${labelString}](command:${commandId})` });
                    await sleep(timeout/10);
                }
                resolve(null);
            });
        }
    );
}
