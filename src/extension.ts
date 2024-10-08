
// Módulo principal com os comandos do VSCode
import * as vscode from 'vscode';
import * as PubSub from 'pubsub-js';
import { sprintf } from 'sprintf-js';

import {encrypt } from './crypto';
import { sendSSHcommand } from './ssh2';
import { scpWrite } from './scp2';
import { JobArrayType, LogOpt, Simulator, SubmitOption } from './types';
import { checkAccountSettings, setSettings, getSettings, setWorkDir, loadSettings } from './settings';
import { createMessageHub } from './messagehub';
import { jobQueueArray, formatJobs, Consumer } from './jobs';
import { pickSiblingModels, getModelName, checkOptions, askCommitHash } from './utils';
import { precheck, check, formattedSettings } from './settingscheck';
import { JobsPanel } from "./panels/jobsPanel";


const PKG = require('../package.json');
import { getCurrentHash } from './git';
import { dismiss } from './dismissable';
import { customConfigLoad } from './customconfig';

let currentJobs : JobArrayType[] = [];


async function activate(context: vscode.ExtensionContext) {
	const vshpcLog = vscode.window.createOutputChannel("vsHPC Log");
	createMessageHub(vshpcLog);
	PubSub.publish(LogOpt.vshpc,'> activate: Extensão "vshpc" está ativa!');

	if (context.extensionMode === vscode.ExtensionMode.Production) {
		PubSub.publish(LogOpt.vshpc,'> activate: Modo de execução ajustado para produção');
	}
	else if (context.extensionMode === vscode.ExtensionMode.Test) {
		PubSub.publish(LogOpt.vshpc,'> activate: Modo de execução ajustado para teste');
	}
	else if (context.extensionMode === vscode.ExtensionMode.Development) {
		PubSub.publish(LogOpt.vshpc,'> activate: Modo de execução ajustado para Desenvolvimento');
	}
	else {
		PubSub.publish(LogOpt.vshpc,'> activate: Modo de execução não determinado');
	}

	//consumidor da fila de envio de jobs, considerando que cada envio não pode
	//sobrepor o outro
	const consumer = new Consumer();

	if (vscode.window.activeTextEditor) {
		setWorkDir(vscode.window.activeTextEditor.document.uri);
	} else {
		setWorkDir(undefined);
	}

	customConfigLoad(context);

	const settings = await loadSettings(context);

	vscode.workspace.onDidOpenTextDocument(e => {
		if (e.uri && e.uri.scheme==='file') {
			const uri = e.uri;
			setWorkDir(uri);
		}
	});

	vscode.window.onDidChangeActiveTextEditor(e => {
		if (e) {
			const doc = e?.document.uri;
			if (vscode.workspace.getWorkspaceFolder(doc)) {
				setWorkDir(doc);
			}
		}
	});

	vscode.workspace.onDidChangeConfiguration(() => {
        loadSettings(context);
		//PubSub.publish(LogOpt.toast,"Configurações recarregadas");
		PubSub.publish(LogOpt.vshpc, '> activate: Novas configurações carregadas');
    });

	const jobsSchema = 'jobsSchema';
	const settingsSchema = 'settingsSchema';

	// para listar os jobs no formato antigo
	const jobsEditorProvider = new class implements vscode.TextDocumentContentProvider {
		onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
		onDidChange = this.onDidChangeEmitter.event;
		provideTextDocumentContent(uri: vscode.Uri) : string {
			const settings = getSettings();
			//PubSub.publish(LogOpt.toast,`URI recebida ${uri} vai ser comparada com ${vscode.Uri.parse('jobsSchema:Jobs' )}`);
			if ( uri.path === vscode.Uri.parse('jobsSchema:Jobs' ).path) {
				return formatJobs(currentJobs);
			}
			return 'Esquema não encontrado';
		}
	};

	//para listar o settings
	const settingsEditorProvider = new class implements vscode.TextDocumentContentProvider {
		onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
		onDidChange = this.onDidChangeEmitter.event;
		provideTextDocumentContent(uri: vscode.Uri) : string {
			const settings = getSettings();
			if ( uri.path === vscode.Uri.parse('settingsSchema:Configurações').path) {
				return formattedSettings;
			}
			return 'Esquema não encontrado';
		}
	};

	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(jobsSchema, jobsEditorProvider));
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(settingsSchema, settingsEditorProvider));

	/**
	 * Seção de comandos destinadas a funcionar o  walkthrough
	 */
	context.subscriptions.push(
		vscode.commands.registerCommand("reshpc.showWelcome", () => {
		  vscode.commands.executeCommand(`workbench.action.openWalkthrough`, 'rogerio-cunha.reshpc#reshpc.welcome', false);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("reshpc.walkChangeSlurm", () => {
			vscode.commands.executeCommand(`workbench.action.openSettings`, `reshpc.scheduler`);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("reshpc.walkChangeSolver", () => {
			vscode.commands.executeCommand('workbench.action.openSettings', 'reshpc.solver');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("reshpc.walkOpenConfig", () => {
			vscode.commands.executeCommand('workbench.action.openSettings', 'reshpc');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("reshpc.OpenConfig", () => {
			vscode.commands.executeCommand('workbench.action.openSettings', 'reshpc');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("reshpc.walkOpenReadme", () => {
			// vscode.commands.executeCommand('workbench.action.splitEditorRight').then(() => {
			// 	vscode.commands.executeCommand('workbench.action.focusRightGroup').then(() => {
					const rdm = vscode.Uri.joinPath(context.extensionUri,'README.md');
					vscode.commands.executeCommand("markdown.showPreview",rdm);
			// 	});
			// });
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("reshpc.OpenReadme", () => {
			const rdm = vscode.Uri.joinPath(context.extensionUri,'README.md');
			vscode.commands.executeCommand("markdown.showPreview",rdm);
		})
	);

	/**
	 * submeter um job diretamente sem fazer clone, nem mesmo precisando de git
	 */
	let jobSubmitDirect = vscode.commands.registerCommand('reshpc.jobSubmitDirect', async function (uri:vscode.Uri, files :any[]) {
		if (uri && files===undefined) {
			files = [];
			files.push(uri);
		}
		if (uri===undefined) {
			files = [];
			files.push(undefined);
		}
		for (let file of files) {
			setWorkDir(file);
			const model = await getModelName(file);
			if (checkOptions({models: [model]})) {
				//console.log('Passou com nome de model '+ model);
				jobQueueArray.push({'model': model, 'submitOption' : SubmitOption.direct, 'specificHash': null});
				consumer.notify();
			}
		}
	});

	/**
	 * submeter um job fazendo um checkout de um commit específico
	 */
	let jobSubmitHash = vscode.commands.registerCommand('reshpc.jobSubmitHash', async function (uri:vscode.Uri, files :any[]) {
		const hash = await askCommitHash();
		if (!hash) {
			PubSub.publish(LogOpt.toast, "Hash inválido");
			return;
		}
		if (uri && files===undefined) {
			files = [];
			files.push(uri);
		}
		if (uri===undefined) {
			files = [];
			files.push(undefined);
		}
		for (let file of files) {
			setWorkDir(file);
			const model = await getModelName(file);
			if (checkOptions({models: [model],hash: hash})) {
				jobQueueArray.push({'model': model, 'submitOption' : SubmitOption.git, 'specificHash': hash});
				consumer.notify();
			} else {
				PubSub.publish(LogOpt.toast, "Hash ou nome inválidos");
			}
		}

	});

	/**
	 * submeter jobs com git
	 */
	let jobSubmit = vscode.commands.registerCommand('reshpc.jobSubmit', async function (uri:vscode.Uri, files :any[]) {
		if (uri && files===undefined) {
			files = [];
			files.push(uri);
		}
		if (uri===undefined) {
			files = [];
			files.push(undefined);
		}
		for (let file of files) {
			setWorkDir(file);
			let specificHash = await getCurrentHash(settings.workdir) || null;
			const model = await getModelName(file);
			if (checkOptions({models: [model]})) {
				jobQueueArray.push({'model': model, 'submitOption' : SubmitOption.git, 'specificHash': specificHash});
				consumer.notify();
			}
		}
	});

	/**
	 * submeter um job para cada arquivo dat do diretório corrente
	 */
	let jobSubmitAll = vscode.commands.registerCommand('reshpc.jobSubmitAll', async function (uri:vscode.Uri) {
		setWorkDir(uri);
		let specificHash = await getCurrentHash(settings.workdir) || null;
		//console.log(JSON.stringify(uri));
		const models = await pickSiblingModels(uri);
		//console.log(`Modelos detectados irmãos: ${models}`);
		if (checkOptions({models: models})) {
			for (let i in models) {
				//SubmitOption.all parece não fazer mais sentido
				jobQueueArray.push({'model': models[i], 'submitOption' : SubmitOption.git, 'specificHash': specificHash});
			};
			consumer.notify();
		}
	});

	/**
	 * submeter um job com 1 step apenas
	 */
	let jobSubmitDirectOneStep = vscode.commands.registerCommand('reshpc.jobSubmitDirectOneStep', async function (uri:vscode.Uri, files: any[]) {
		if (uri && files===undefined) {
			files = [];
			files.push(uri);
		}
		if (uri===undefined) {
			files = [];
			files.push(undefined);
		}
		for (let file of files) {
			setWorkDir(file);
			const model = await getModelName(file);
			if (checkOptions({models: [model]})) {
				//console.log('Passou com nome de model '+ model);
				jobQueueArray.push({'model': model, 'submitOption' : SubmitOption.oneStep, 'specificHash': null});
				consumer.notify();
			}
		}
	});

	/**
	 * submeter um job apenas para checar a sintaxe
	 */
	let jobSubmitDirectCheck = vscode.commands.registerCommand('reshpc.jobSubmitDirectCheck', async function (uri:vscode.Uri, files: any[]) {
		if (uri && files===undefined) {
			files = [];
			files.push(uri);
		}
		if (uri===undefined) {
			files = [];
			files.push(undefined);
		}
		for (let file of files) {
			setWorkDir(file);
			const model = await getModelName(file);
			if (checkOptions({models: [model]})) {
				//console.log('Passou com nome de model '+ model);
				jobQueueArray.push({'model': model, 'submitOption' : SubmitOption.check, 'specificHash': null});
				consumer.notify();
			}
		}
	});

	const jobsMgmt = vscode.commands.registerCommand("reshpc.jobsMgmt", () => {
		JobsPanel.render(context.extensionUri, context);
	});


	let checkSettings = vscode.commands.registerCommand('reshpc.checkSettings', async function () {
		vscode.commands.executeCommand('workbench.action.splitEditorRight').then(() => {
			vscode.commands.executeCommand('workbench.action.focusRightGroup').then(async () => {
				const uri = vscode.Uri.parse('settingsSchema:Configurações' );
				precheck();
				const doc = await vscode.workspace.openTextDocument(uri);
				await vscode.window.showTextDocument(doc, {preview : false});
				settingsEditorProvider.onDidChangeEmitter.fire(uri); //coloca o texto que estiver já em "formattedSettings"
				await check();
				settingsEditorProvider.onDidChangeEmitter.fire(uri); //coloca todo o texto que estiver em "formattedSettings"
			});
		});
	});

	let jobCheckSSH = vscode.commands.registerCommand('reshpc.jobCheckSSH', async function() {
		const settings = getSettings();
		if (!checkAccountSettings()) {
			return;
		}
		PubSub.publish(LogOpt.vshpc,`> jobCheckSSH: chamado com ${settings.cluster}, ${settings.user}, ********`);
		let ret = await sendSSHcommand('pwd',[''], settings.cluster,settings.user,settings.passwd, settings.privRsaKey);
		if (ret) {
			PubSub.publish(LogOpt.vshpc,`> jobCheckSSH: Valor retornado: Código:` +
			` ${ret.code}, Mensagem :${ret.stdout}, Erro: ${ret.code!==0 ? ret.stderr : 'sem erro'}`);
		}
		if (ret && ret.code===0) {
			PubSub.publish(LogOpt.toast,'SSH para o host está OK!');
		}
		if (ret && ret.code!==0) {
			vscode.window.showErrorMessage('SSH está com erro, verifique as configurações de conexão.');
		}

	});

	/**
	 * Job de teste enviando +- conforme devem ser os demais casos
	 */
	let jobEnterPassword = vscode.commands.registerCommand('reshpc.jobEnterPassword', async function() {
		const settings = getSettings();
		vscode.window.showInputBox({title: "Password", prompt:'Entre com sua password',
		password: true, placeHolder:'<windows password>' }).then( async function(value) {
			if (value) {
				let enc = encrypt(value);
				await vscode.workspace.getConfiguration('reshpc').update('connection.password',enc, true);
				setSettings('passwd', enc);
			}
		});
	});

	let jobMock = vscode.commands.registerCommand('reshpc.jobMock', async function() {
		const settings = getSettings();
		if (!checkAccountSettings()) { return; }

		let simulator = settings.customConfig.simulators ? settings.customConfig.simulators.find(e=>e.name==='test'): null;

		if (!simulator) {
			PubSub.publish(LogOpt.vshpc, '> jobMock: Não achado o simulador de teste');
			return;
		}
		if (settings.account.length === 0) {
			PubSub.publish(LogOpt.toast,`É necessário definir o account primeiro nas configurações do SLURM`);
			return;
		}
		const nonce = Math.floor(1000000 + Math.random() * 9000000);
		let basePath = '/u/' + settings.user.toLowerCase();
		if (simulator?.scriptDirPrefix.length !== 0 ) {
			basePath = simulator?.scriptDirPrefix || '.';
		}
		const params = {
			jobName: `teste_vscode_${nonce}.mock`,
			account: settings.account,
			jobComment: 'vshpc_mock',
			slurm: settings.slurm,
			solverExtras : simulator.defaultSolverExtras,
			scriptURI : basePath + '/slurm_' + settings.user + '.sh',
			chdir:  basePath,
			profile: 'source /etc/profile',
			sbatch: settings.sbatch
		};
		let script = sprintf((simulator? simulator.script : []).join('\n'), params);
		let sent = await scpWrite(script,params.scriptURI,settings.cluster,settings.user,settings.passwd, settings.privRsaKey);
		if (sent) {
			let cmd = sprintf(simulator? simulator.cmd.join(' '):'',params);
			PubSub.publish(LogOpt.vshpc, `> jobMock: script de teste: ${script}`);
			PubSub.publish(LogOpt.vshpc,`> jobMock: comando enviado para um job de ${simulator?.defaultSolverExtras} segundos`);

			let ret = await sendSSHcommand(cmd, [''], settings.cluster,settings.user,settings.passwd, settings.privRsaKey);
			//console.log('Retorno raw do job de teste ' + JSON.stringify(ret));
			if (ret && ret.code === 0) {
				let text = ret.stdout;
				const match = text.match(/\d+/);
				if (match) {text = match[0];};
				//PubSub.publish(LogOpt.toast,`Job criado com: ${ret.stdout}`);
				dismiss(`Criado job ${text}`,()=>{
                    vscode.commands.executeCommand('reshpc.jobsMgmt');
                },10000," Gerenciar");
				PubSub.publish(LogOpt.vshpc,`> jobMock: Job criado com: ${ret.stdout}`);
			}
			if (ret && ret.code !== 0) {
				PubSub.publish(LogOpt.vshpc,`> jobMock: Job com erro ${ret.stderr}`);
				PubSub.publish(LogOpt.toast,`jobMock: Job com erro ${ret.stderr}`);
			}
		} else {
			PubSub.publish(LogOpt.vshpc,`> jobMock: envio do .sh falhou via SCP`);
			PubSub.publish(LogOpt.toast,`jobMock:  envio do .sh falhou via SCP`);
		}
	});

	let curVersion = vscode.commands.registerCommand('reshpc.version', function() {
		if ( 'version' in PKG) {
			PubSub.publish(LogOpt.toast, `Versão: ${PKG.version}`);
		}
	});

	context.subscriptions.push(vscode.commands.registerCommand('reshpc.logs', () => {
        vshpcLog.show();  // Exibe o canal de saída no painel Output
    }));

	let selectSimulVersion = vscode.commands.registerCommand('reshpc.selectSimulVersion', function() {

	});

	context.subscriptions.push(jobSubmit);
	context.subscriptions.push(jobSubmitHash);
	context.subscriptions.push(jobSubmitDirect);
	context.subscriptions.push(jobSubmitDirectOneStep);
	context.subscriptions.push(jobSubmitDirectCheck);
	context.subscriptions.push(jobSubmitAll);
	context.subscriptions.push(jobsMgmt);
	context.subscriptions.push(jobCheckSSH);
	context.subscriptions.push(checkSettings);
	context.subscriptions.push(jobEnterPassword);
	context.subscriptions.push(jobMock);
	context.subscriptions.push(curVersion);
	context.subscriptions.push(selectSimulVersion);

}

function deactivate() {}

module.exports = {
	activate,
	deactivate
};


