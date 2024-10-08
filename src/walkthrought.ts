	/**
	 * Seção de comandos destinadas a funcionar o  walkthrough
	 */

    import * as vscode from 'vscode';
	const API_ID='vshpc';

    export function setWalkthroughsCmds(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("vshpc.showWelcome", () => {
		  vscode.commands.executeCommand(`workbench.action.openWalkthrough`, 'rogerio-cunha.vshpc#vshpc.welcome', false);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("vshpc.walkChangeSlurm", () => {
			vscode.commands.executeCommand(`workbench.action.openSettings`, `vshpc.scheduler`);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("vshpc.walkChangeSolver", () => {
			vscode.commands.executeCommand('workbench.action.openSettings', 'vshpc.solver');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("vshpc.walkOpenConfig", () => {
			vscode.commands.executeCommand('workbench.action.openSettings', API_ID);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("vshpc.OpenConfig", () => {
			vscode.commands.executeCommand('workbench.action.openSettings', API_ID);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("vshpc.walkOpenReadme", () => {
			// vscode.commands.executeCommand('workbench.action.splitEditorRight').then(() => {
			// 	vscode.commands.executeCommand('workbench.action.focusRightGroup').then(() => {
					const rdm = vscode.Uri.joinPath(context.extensionUri,'README.md');
					vscode.commands.executeCommand("markdown.showPreview",rdm);
			// 	});
			// });
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("vshpc.OpenReadme", () => {
			const rdm = vscode.Uri.joinPath(context.extensionUri,'README.md');
			vscode.commands.executeCommand("markdown.showPreview",rdm);
		})
	);
}