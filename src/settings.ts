import * as vscode from 'vscode';
import * as PubSub from 'pubsub-js';
import * as path from 'path';
import * as fs from 'fs';
import { SettingsType, LogOpt, Simulator, CustomConfig, CustomError, FolderFormats } from './types';

const CUSTOM_CONFIG_NAME = 'reshpc.json';

import { decrypt } from './crypto';

let settings: SettingsType = {
	user: "",
	passwd: "",
	privRsaKey: "",
	cluster: "",
	windowsUnix: {},
	destination: "",
	folderFormat: "",
	solverName: "",
	solverVersion: "",
	account: "",
	slurm: "",
	sbatch: "",
	solverExtras: "",
	solverCores: 1,
	solverNodes: 1,
	ntasksPerNode: 1,
	mpiExtras: "",
	workdir: "",
	solverConfigFile: "",
	customConfigURI: "",
	webviewHistSize: 10,
	webviewJobsSize: 10,
	customConfig: {} as CustomConfig
};

function getAccount(input: string): string {
	const regexShort = /-A\s+(\S+)/;
	const regexLong = /--account=(\S+)/;
	let match = input.match(regexShort);
	if (match && match[1]) {
		return match[1];
	}
	match = input.match(regexLong);
	if (match && match[1]) {
		return match[1];
	}
	return '';
}

function removeAccountParameter(input: string): string {
	const regexShort = /-A\s+\S+/g;
	const regexLong = /--account=\S+/g;
	let output = input.replace(regexShort, '').replace(regexLong, '');
	output = output.replace(/\s{2,}/g, ' ').trim();
	return output;
}

/**
 * Ajusta um valor do settings global contido nesta unity por algum código externo
 * @param key
 * @param value
 */
export function setSettings(key: string, value: string | boolean) {
	if (key in settings) {
		(settings as any)[key] = value;
		//PubSub.publish(LogOpt.vshpc,`> setSettings: Ajustado a ${key} para o valor ${value}`);
	} else {
		PubSub.publish(LogOpt.vshpc, `> setSetting: chave ${key} não encontrada`);
	}
};

/**
 * Seta o settings.workdir com base na URI, descobrindo a qual workspacefolder ele pertence.
 * ou se associando ao primeiro workspace
 * @param _uri (vscode.Uri)
 */
export function setWorkDir(_uri: vscode.Uri | undefined) {
	if (_uri && vscode.workspace.getWorkspaceFolder(_uri)) {
		if (settings.workdir === vscode.workspace.getWorkspaceFolder(_uri)?.uri.fsPath) {
			return;
		}
		settings.workdir = vscode.workspace.getWorkspaceFolder(_uri)?.uri.fsPath || "";

	} else {
		if (settings.workdir === '') {
			if (vscode.workspace.workspaceFolders) {
				settings.workdir = vscode.workspace.workspaceFolders[0].uri.fsPath;
			} else {
				settings.workdir = "";
				PubSub.publish(LogOpt.vshpc, "> getSettings: Workdir foi definido como vazio");
			}
		}
	}
	PubSub.publish(LogOpt.vshpc, `> getSettings: Workdir foi definido para ${settings.workdir}`);
}

export function getSettings(): SettingsType {
	return settings;
};

export function loadSettings(context: vscode.ExtensionContext): SettingsType {
	let ret: string | undefined;

	try {

		settings.customConfig = getCustomConfig(context) as CustomConfig;


		let user = process.env.USERNAME;
		if (user === undefined) {
			user = "";
		}
		settings.user = vscode.workspace.getConfiguration("reshpc").get("connection.user", "").trim().toLowerCase();
		if (!settings.user || settings.user === "") {
			settings.user = user.toLowerCase();
			vscode.workspace.getConfiguration("reshpc").update("connection.user", settings.user, true);
		}
		if (user.length < 3) {
			PubSub.publish(LogOpt.vshpc, "> getSettings: configuração do usuário está errada ou indefinida");
		}
		settings.passwd = vscode.workspace.getConfiguration("reshpc").get("connection.password", "").trim();

		settings.privRsaKey = vscode.workspace.getConfiguration("reshpc").get("connection.privRsaKey", "").trim();
		if (settings.privRsaKey === "") {
			settings.privRsaKey = settings.customConfig.settings.defaultPrivRSAKey.replace("{user}", settings.user);
			vscode.workspace.getConfiguration("reshpc").update("connection.privRsaKey", settings.privRsaKey, true);
		}

		if (settings.passwd === "" && settings.privRsaKey === "") {
			PubSub.publish(LogOpt.vshpc, "> getSettings: Ou é necessário password ou chave RSA privada");
		}

		settings.cluster = vscode.workspace.getConfiguration("reshpc").get("connection.cluster", "").trim();
		if (!settings.cluster || settings.cluster === "") {
			settings.cluster = settings.customConfig.settings.defaultCluster;
			vscode.workspace.getConfiguration("reshpc").update("connection.cluster", settings.cluster, true);
		}

		settings.windowsUnix = vscode.workspace.getConfiguration("reshpc").get("path.WindowsUnix", {});
		if (Object.keys(settings.windowsUnix).length === 0) {
			settings.windowsUnix = settings.customConfig.settings.defaultWindowsUnix;
			vscode.workspace.getConfiguration("reshpc").update("path.WindowsUnix", settings.windowsUnix, true);
		}

		settings.destination = vscode.workspace.getConfiguration("reshpc").get("path.destination", "");
		if (!settings.destination || settings.destination === "") {
			settings.destination = "..\\";
			vscode.workspace.getConfiguration("reshpc").update("connection.destination", settings.destination, true);
		}

		settings.folderFormat = vscode.workspace.getConfiguration("reshpc").get("path.folderFormat", "");
		if (settings.folderFormat === "") {
			settings.folderFormat = settings.customConfig.settings.defaultFolderFormat;
		}
		if (Object.keys(FolderFormats).includes(settings.folderFormat)) {
			settings.folderFormat = (FolderFormats as Record<string, string>)[settings.folderFormat];
		} else { settings.folderFormat = "%(projectName)s_%(hash)s"; }

		settings.solverVersion = vscode.workspace.getConfiguration("reshpc").get("solver.type.version", "").trim();

		settings.solverName = vscode.workspace.getConfiguration("reshpc").get("solver.type.name", "").trim();


		if (Object.keys(settings.customConfig.settings.solverNames).includes(settings.solverName)) {
			settings.solverName = (settings.customConfig.settings.solverNames)[settings.solverName];
		}



		let simulator = settings.customConfig.simulators.find((item) => item.solvers.find(sol => sol === settings.solverName)) as Simulator;

		settings.account = vscode.workspace.getConfiguration("reshpc").get("scheduler.SlurmAccount", "");
		if (settings.account==="") {
			settings.account = settings.customConfig.settings.defaultSlurmAccount;
		}
		settings.account = settings.account
			.replace('-P ', '')
			.replace('-A ', '')
			.replace('--account ', '')
			.replace('-p ', '')
			.replace('--projeto', '')
			.replace('- ', '')
			.trim();

		settings.slurm = vscode.workspace.getConfiguration("reshpc").get("scheduler.slurm", "").trim();

		if (settings.account === "") {
			settings.account = getAccount(settings.slurm);
			if (settings.account) {
				settings.slurm=removeAccountParameter(settings.slurm);
			}
		}

		settings.sbatch = simulator.sbatch.trim() || "/usr/bin/sbatch";

		settings.solverExtras = vscode.workspace.getConfiguration("reshpc").get("solver.ExtraParams", "").trim();

		if (!settings.solverExtras || settings.solverExtras === "") {
			if (simulator && settings.solverExtras === '') {
				settings.solverExtras = simulator.defaultSolverExtras;
				PubSub.publish(LogOpt.vshpc, `> getSettings: valor do solverExtras ajustado para o default ${settings.solverExtras || 'vazio'}, por estar vazio`);
			}
		}

		if (!settings.solverVersion || settings.solverVersion === "") {
			if (simulator && settings.solverVersion === '') {
				settings.solverVersion = simulator.defaultSolverVersion;
				PubSub.publish(LogOpt.vshpc, `> getSettings: valor do solverVersion ajustado para o default ${settings.solverVersion}, por estar vazio`);
			}
		}

		settings.solverConfigFile = vscode.workspace.getConfiguration("reshpc").get("solver.solverConfigFile", "").trim();
		if (settings.solverConfigFile === "") {
			settings.solverConfigFile = simulator.defaultSolverConfigFile;
			PubSub.publish(LogOpt.vshpc, `> getSettings: valor do solverConfigFile ajustado para o default ${simulator.defaultSolverConfigFile}, por estar vazio`);
		}

		if (settings.slurm === "") {
			if (simulator && (simulator.name === 'gem_sbr' || simulator.name === 'cmg')) {
				settings.slurm = simulator.defaultSlurm;
				PubSub.publish(LogOpt.vshpc, `> getSettings: parâmetro do SLURM ajustado para o default ${settings.slurm}, por estar vazio`);
			}
		}

		// while (settings.solverBRConfig.length > 0 && (settings.solverBRConfig[0] === '.' || settings.solverBRConfig[0] === '/')) {
		// 	settings.solverBRConfig = settings.solverBRConfig.substring(1);
		// }
		settings.solverCores = vscode.workspace.getConfiguration("reshpc").get("solver.resources.cores", 1);
		settings.solverNodes = vscode.workspace.getConfiguration("reshpc").get("solver.resources.nodes", 1);
		settings.ntasksPerNode = vscode.workspace.getConfiguration("reshpc").get("solver.resources.ntasksPerNode", 1);
		settings.mpiExtras = vscode.workspace.getConfiguration("reshpc").get("solver.resources.mpiExtras", "");

		settings.customConfigURI = vscode.workspace.getConfiguration("reshpc").get("report.customConfigURI", "").trim();
		settings.webviewHistSize = Number(vscode.workspace.getConfiguration("reshpc").get("webview.histSize", "20").trim());
		settings.webviewJobsSize = Number(vscode.workspace.getConfiguration("reshpc").get("webview.jobsSize", "20").trim());
		let verErro = false;
		switch (simulator.name) {
			case 'cmg':
				if (!settings.solverVersion.match(/\d{4}\.\d{2}/)) {
					verErro = true;
				}
				break;
			case 'gem_sbr':
				if (!settings.solverVersion.match(/\d{8}/)) {
					verErro = true;
				}
				break;
			case 'geomec':
				if (!settings.solverVersion.match(/v\d+\.\d/)) {
					verErro = true;
				}
				break;
			case 'igeo':
				if (!settings.solverVersion.match(/v\d+\.\d/)) {
					verErro = true;
				}
				break;
			case 'opm':
				if (!settings.solverVersion.match(/\d{4}\.\d{2}/)) {
					verErro = true;
				}
				break;
			case 'geosx':
				if (!settings.solverVersion.match(/\d{4}\.\d{2}/)) {
					verErro = true;
				}
				break;
			case 'eclipse':
				if (!settings.solverVersion.match(/\d{4}\.\d/)) {
					verErro = true;
				}
				break;
		}

		if (verErro) {
			settings.solverVersion = simulator.defaultSolverVersion;
			PubSub.publish(LogOpt.toast, `Reajustada versão do solver para ${settings.solverVersion}. Confira o settings.`);
		}

	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		PubSub.publish(LogOpt.vshpc, `> loadSettings: ${msg}`);
	};

	return settings;
};

//verificações necessárias para um SSH
export function checkAccountSettings(): boolean {

	try {
		if (settings.passwd.length > 0 && settings.privRsaKey === "") {

			const ret = decrypt(settings.passwd);
			if (ret && ret.length < 8) {
				PubSub.publish(LogOpt.toast, 'Configure a senha do SSH via comando `HPC: Entre com a Senha SSH` ou use uma chave RSA');
				return false;
			}
		}
	} catch (e) {
		PubSub.publish(LogOpt.toast, 'Configure a senha do SSH via comando `HPC: Entre com a Senha SSH`');
	}
	if (settings.user.length < 4) {
		PubSub.publish(LogOpt.toast, 'Usuário incorreto. Configure o usuário para o SSH');
		return false;
	}
	if (settings.cluster.length < 4) {
		PubSub.publish(LogOpt.toast, 'Nome do cluster incorreto. Configure o cluster para o SSH');
		return false;
	}
	return true;
}

//verificações apenas necessárias para enviar jobs de produção
export function checkSubmitSettings(): boolean {

	if (Object.keys(settings.windowsUnix).length === 0) {
		PubSub.publish(LogOpt.toast, 'Configuração "de-para" de pastas incorreto. Configure o "de-para"');
		return false;
	}

	if (settings.solverName.length < 2) {
		PubSub.publish(LogOpt.toast, 'Nome do solver incorreto ou não configurado. Configure');
		return false;
	}
	if (settings.solverVersion.length < 2) {
		PubSub.publish(LogOpt.toast, 'Versão do solver incorreta ou não configurada. Configure');
		return false;
	}

	if (settings.workdir.length === 0) {
		PubSub.publish(LogOpt.toast, 'Não identificado um workdir. Abra uma pasta com um projeto');
		return false;
	}

	return true;
};


/**
 * Carrega do arquivo de descrito em CUSTOM_CONFIG_NAME
 * @returns CustomConfig
 */
function getCustomConfig(context: vscode.ExtensionContext) {

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