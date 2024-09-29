import * as vscode from 'vscode';
import * as PubSub from 'pubsub-js';
import { dismiss } from './dismissable';
import { LogOpt } from './types';




/**
 * roteia as menagens enviadas por eventos PubSub
 */ 
export function createMessageHub(vshpcLog: vscode.OutputChannel) {

	//mostra mensagens no vshpcLog
	let log2vshpcLog = function (msg: string, data: string) {
		vshpcLog.appendLine(`${msg} ${data}`);
	};
	PubSub.subscribe(LogOpt.vshpc, log2vshpcLog);

	//mostra as mensagens no vscode toast
	let log2InfoMessage = function (msg: string, data: string) {
		msg;
		if (!data.startsWith("<END>")) {
			vscode.window.showInformationMessage(data);
		}
	};
	PubSub.subscribe(LogOpt.toast, log2InfoMessage);

	//mostra as mensagens no vscode toast
	let log2InfoErrorMessage = function (msg: string, data: string) {
		msg;
		if (!data.startsWith("<END>")) {
			vscode.window.showErrorMessage(data);
		}
	};
	PubSub.subscribe(LogOpt.toast_error, log2InfoErrorMessage);

	//mostra mensagens no status Bar
	let log2StatusBar = function (msg: string, data: string) {
		msg;
		vscode.window.setStatusBarMessage(data, 8000);
	};
	PubSub.subscribe(LogOpt.bar, log2StatusBar);

	//mostra as mensagens no vscode dismissible com progresso
	let log2Dismissable = function (msg: string, data: Object, timeout=10000, labelString=" Detalhe") {
		msg;
		if (typeof data === 'object' && 'message' in data && 'callback' in data) {
			dismiss(data.message as string, data.callback as Function,timeout,labelString);
		} else {
			console.log("Mensagem dismissible mal formada");
		}
	};
	PubSub.subscribe(LogOpt.dismissable, log2Dismissable);
}


/**
 * cuida da janela de progresso
 */
export async function showProgress() {
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: "Submissão, aguarde",
		cancellable: false
	}, (progress, token) => {
		let inc = 0;
		let finish = false;
		let jobHadSuccess = false;
		let lastMessage = 'começando...';

		token.onCancellationRequested(() => {
			//caso habilite o cancellable essa função
			//entraria em ação, mas não é o caso por enquanto
			//console.log("Usuário cancelou");
			return;
		});
		progress.report({ increment: 0, message: "Inciando o processo de submissão" });
		let log2Progress = function (msg: string, data: string) {
			msg;
			if (data.startsWith("<END>")) {
				//console.log("Fim do progress bar chegou por um <END>");
				finish = true; //para dar tempo de ver o ID do job
				if (data.includes("<TRUE>")) {
					jobHadSuccess=true;
				}
				return;
			}
			if (data.includes(' files:')) {
				progress.report({ increment: 0, message: data });
			} else {
				progress.report({ increment: 1, message: data });
				inc = inc + 1;
			}
			lastMessage = data;
		};
		PubSub.subscribe(LogOpt.progress, log2Progress);

		const p = new Promise<void>(resolve => {
			const interval = setInterval(() => {
				if (finish) {
					progress.report({ increment: 100 - inc, message: 'Encerrado' });
					//console.log("Promise resolvida");
					clearInterval(interval);
					if (jobHadSuccess) {
						jobHadSuccess=false;
						dismiss(`Veja o painel de`,()=>{
							vscode.commands.executeCommand('vshpc.jobsMgmt');
						},10000," Gerenciamento de jobs");
					}

					setInterval(() => resolve(), 1000);
				} else {
					//console.log("Incrementando progress pelo timeout");
					progress.report({ increment: 1, message: lastMessage });
					inc = inc + 1;
					if (inc > 105) {
						progress.report({ increment: 0, message: "Tempo limite da operação excedido" });
						finish = true;
					}
				}
			}, 1000);
		});

		return p;
	});
}

