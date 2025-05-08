/**
 * Seção de comandos destinadas a funcionar o  walkthrough
 */

import * as vscode from 'vscode';
import * as PubSub from 'pubsub-js';
import { APP_NAME } from './types';

export function setWalkthroughsCmds(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('rogerio-cunha.vshpc.showWelcome', () => {
            vscode.commands.executeCommand(
                `workbench.action.openWalkthrough`,
                'rogerio-cunha.vshpc#vshpc.welcome',
                false,
            );
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('rogerio-cunha.vshpc.walkChangeSlurm', () => {
            vscode.commands.executeCommand(`workbench.action.openSettings`, 'vshpc.scheduler');
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('rogerio-cunha.vshpc.walkChangeSolver', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'vshpc.solver');
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('rogerio-cunha.vshpc.walkOpenConfig', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', `${APP_NAME}.`);
            //este ponto evita filtrar outras extensões
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('rogerio-cunha.vshpc.OpenConfig', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', `${APP_NAME}.`);
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('rogerio-cunha.vshpc.walkOpenReadme', () => {
            // vscode.commands.executeCommand('workbench.action.splitEditorRight').then(() => {
            // 	vscode.commands.executeCommand('workbench.action.focusRightGroup').then(() => {
            const rdm = vscode.Uri.joinPath(context.extensionUri, 'README.md');
            vscode.commands.executeCommand('markdown.showPreview', rdm);
            // 	});
            // });
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('rogerio-cunha.vshpc.OpenReadme', () => {
            const rdm = vscode.Uri.joinPath(context.extensionUri, 'README.md');
            vscode.commands.executeCommand('markdown.showPreview', rdm);
        }),
    );
}
