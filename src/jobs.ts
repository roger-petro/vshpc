import * as vscode from 'vscode';
import * as PubSub from 'pubsub-js';
import { JobArrayType, RetMsg, SettingsType, LogOpt, SubmitOption, JobQueueElement } from './types';
import { checkAccountSettings, getSettings, checkSubmitSettings } from './settings';
import { submit } from './submit';
import { sendSSHcommand } from './ssh2';
import { getCurrentHash } from './git';
import { Repository } from './repository';
import { showProgress } from './messagehub';
import path from 'path';




/**
 * Fila onde são depositados os jobs a serem enviados
 */
export const jobQueueArray: JobQueueElement[] = [];

let repository: Repository|null = null;



/**
 * consome toda fila de jobs que foram solicitados pelo
 * usuário via UI. Executando um de cada vez.
 */
export class Consumer {
	protected isProcessing: boolean;
	protected lastReturn: boolean;
	constructor () {
		this.isProcessing = false;
		this.lastReturn = false;
	}
	notify() {
		if (this.isProcessing) {
			return;
		} else {
			showProgress();
			this.consumeNext();
		}
	};
	async consumeNext() {
		this.isProcessing = true;
		if (jobQueueArray.length > 0) {
			const job = jobQueueArray.shift();
			if (job) {
				this.lastReturn = await sendJob(job.model,job.submitOption,job.specificHash);
				setTimeout(( ) => {this.consumeNext();},4000);
			}
		} else {
			this.isProcessing = false;
			setTimeout(( ) => {
				PubSub.publish(LogOpt.progress, this.lastReturn? "<END><TRUE>": "<END>");
			},4000);
		}
	};
};

/**
 * Avalia se em drymode ou não e envia os jobs para o submit.ts
 * mas antes inspeciona se já não havia um job rodando para este modelo!
 * Apresenta as mensagens de erro na UI conforme o caso
 * @param model
 * @param option
 * @param specificHash
 */
async function sendJob(model:string, option: SubmitOption, specificHash: string|null) {
	//submissão!
	const settings = getSettings();
	let jobName = "";

	if (option === SubmitOption.git) {
		if (!specificHash) {
			specificHash = await getCurrentHash(settings.workdir);
		}
		if (!repository) {
			repository = new Repository(settings,specificHash);
		}

		PubSub.publish(LogOpt.progress,`Obtendo os dados do repositório`);
        if (await repository.getLocalMetaData(specificHash)) {
            PubSub.publish(LogOpt.progress,`Obtendo metadados do repositório`);
            if (! await repository.getRemoteMetaData()) {
                PubSub.publish(LogOpt.vshpc,`> submit: Pasta remota possivelmente não existia ou não era controlada por git`);
            } else {
                PubSub.publish(LogOpt.vshpc, `> submit: pego os dados remotos`);
            }
        } else {
			PubSub.publish(LogOpt.vshpc, `> submit: Está controlado pelo git? Falha ao submeter.`);
            return false;
        };

		const remotePath = repository.getRemoteClonePath();

		jobName =  path.basename(model); //model.split('/').slice(-1);  //replace(/\//g, '_') + '.' + `${specificHash.substring(0,8)}`;
		const prefix = path.dirname(model);

		PubSub.publish(LogOpt.progress,`Verificando se não há um job em curso para este modelo`);


	} else {
		//caso seja um submit direct
		[jobName] = model.split('/').slice(-1);
		//jobName = model.replace(/\//g, '_');
		repository = null;
	}


	const VSHPC = getSettings().customConfig;
	let isDry = VSHPC.settings.dryMode as boolean ||
	vscode.workspace.getConfiguration("petro.vshpc").get("debug.drymode",false);

	let ret = await submit(model ,settings, option, isDry,  repository);
	if (ret && ret.success) {
		PubSub.publish(LogOpt.progress,`Job criado com: ${ret.message}`);
		PubSub.publish(LogOpt.bar, `Job criado com: ${ret.message}. Faltam ${jobQueueArray.length} jobs para serem submetidos`);
		PubSub.publish(LogOpt.vshpc,`> sendJob: Job criado com: ${ret.message}`);
		return true;
		//setTimeout(() => {console.log('Esperando a mensagem com o numero do job');},4000); //para dar tempo de ler a mensagem
	}
	if (ret && !ret.success) {
		PubSub.publish(LogOpt.progress,`Falha ao submeter: ${ret.message}`);
		PubSub.publish(LogOpt.vshpc,`> sendJob: Falha ao submeter: ${ret.message}`);
	}

	return false;
}

export function showJob2Kill(jobAr: JobArrayType) : boolean {

	const settings = getSettings();
	if (!checkAccountSettings()) {return false;}

	if (jobAr && Object.keys(jobAr).length ===0) {return false;}
	vscode.window.showInformationMessage(
		` ID: ${jobAr.id}(${jobAr.name}).  📡: ${jobAr.state}. ⏲️:${jobAr.age}. 💰: ${jobAr.account}.` + 
		` 🧜: ${jobAr.partition}. 🖥️: ${jobAr.nodes}. 👉: "${jobAr.command}"`, 'Matar Job','Cancelar')
		.then ( async (value: string|undefined) =>{
		if (value === 'Matar Job') {
			let ret = await killJob(settings, jobAr.id);
			if (ret && ret.success) {
				PubSub.publish(LogOpt.toast,`Encerrado o job ${jobAr.id}`);
				return true;
			}
			if (ret && !ret.success) {
				PubSub.publish(LogOpt.toast,`Não foi possível encerrar o job: ${ret.message}`);
				return false;
			}
		}
		return false;
	});
	return false;
};

/**
 * Obtém os jobs que estão sendo executados no cluster para o usuário corrente
 * e coloca a lista em um array
 * @param settings
 * @param key pode ser user ou account para filtrar
 * @param _type pode ser "user"|"account"|""
 * @param ids, array com os IDs para listar apenas eles
 * @returns
 */
export async function getJobs(settings: SettingsType, payload:any): Promise<JobArrayType[]> {
    //retorno do squeue array com (-h tira o cabeçalho!):
    // 1 id;
    // 2 tempo_execução(dias,horas,min,seg);
    // 3 nos_usados;
    // 4 partition;
    // 5 state(formato estendido);
    // 6 data_inicio;
    // 7 comando executado
    // 8 account
    // 9 jobname
    // 10 usuário                                            1 2   3  4  5  6  7 8  9
	//tirei a opção -h do comando para mostrar sempre uma linha na resposta
	let filterUser = "";
	let filterAccount="";
	if (payload.userOk) {
		if (payload.user.length===4) {
			filterUser = `-u ${payload.user}`;
		}
	}
	if (payload.accountOk && payload.account.length > 0) {
		filterAccount = ` -A ${payload.account}`;
	}

	if (filterUser==="" && filterAccount==="") {
		//não permite pegar todos os jobs
		filterUser = ` -u ${settings.user}`;
	}

	const outputFormat = "%A;%M;%N;%P;%T;%V;%o;%a;%j;%u;%C;%Z;%q;%k";
    let cmd = `squeue ${filterUser} ${filterAccount} --format "${outputFormat}"  --sort=-V 2>/dev/null`;

	PubSub.publish(LogOpt.vshpc, `> getJobs: ${cmd}`);
    let ret = await sendSSHcommand(cmd,[''],settings.cluster,settings.user,settings.passwd, settings.privRsaKey);
    try {
        let jobsArray: JobArrayType[] = [];
        if (ret && ret.code === 0 && ret.multiline!== undefined && ret.multiline.length > 0) {
			//pula a primeira linha, já que o ssh esta descartando respostas com linhas vazias
			//por isso i=1
            for (let i = 1; i < ret.multiline.length; i++) {
                let job = ret.multiline[i].trim().split(';');
                if (job.length !== outputFormat.split(';').length) {
                    PubSub.publish(LogOpt.vshpc, '> getJobs: Quantidade de informações insuficientes');
                    return [];
                }
                jobsArray.push( {
                    id:         job[0],
                    age:        job[1],
                    nodes:      job[2],
                    partition:  job[3],
                    state:      job[4],
                    startTime:  job[5],
                    command:    job[6],
                    account:    job[7],
                    name:       job[8],
					user:		job[9],
					cores:		job[10],
					cluster:    "Reservatório",
					work_dir:	job[11],
					qos: job[12],
					comment: job[13]
                });
            }
            return jobsArray;
        }
        else {
			PubSub.publish(LogOpt.vshpc, `> getJobs: Algo errado ao retornar os jobs. Código: ${ret.code} stdout: ${ret.stdout} stderr: ${ret.stderr}`);
			return [];
		}
    } catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
        PubSub.publish(LogOpt.vshpc,`> getJobs: ${msg}`);
        return [];
    }
};



/**
 * Obtém os jobs que estão sendo executados no cluster para o usuário corrente
 * e coloca a lista em um array
 * @param settings
 * @param key pode ser user ou account para filtrar
 * @param _type pode ser "user"|"account"|""
 * @param ids, array com os IDs para listar apenas eles
 * @returns
 */
export async function getUserJobUpdates(settings: SettingsType, payload:any): Promise<JobArrayType[]> {

	let filterUser = "";

	if (payload.userOk) {
		if (payload.user.length===4) {
			filterUser = `-u ${payload.user}`;
		}
	}

	let jobs="";
	if (payload.jobs) {
		if (Array.isArray(payload.jobs)) {
			jobs= "--jobs " + payload.jobs.join(',');
		} else {
			jobs= "--jobs " + payload.jobs;
		}
	}
	const outputFormat = "JobID,Elapsed,State,Partition";
    let cmd = `sacct -p ${filterUser} ${jobs} --format "${outputFormat}"  2>/dev/null`;
	//PubSub.publish(LogOpt.vshpc, `> getUserJobUpdates: ${cmd}`);
    let ret = await sendSSHcommand(cmd,[''],settings.cluster,settings.user,settings.passwd, settings.privRsaKey);
    try {
        let jobsArray: any[] = [];
        if (ret && ret.code === 0 && ret.multiline!== undefined && ret.multiline.length > 0) {
			//pula a primeira linha, já que o ssh esta descartando respostas com linhas vazias
			//por isso i=1
            for (let i = 1; i < ret.multiline.length; i++) {
                let job = ret.multiline[i].trim().split('|');
                if (job.length < outputFormat.split('|').length) {
                    PubSub.publish(LogOpt.vshpc, '> getJobs: Quantidade de informações insuficientes');
                    return [];
                }
				if (job[3]==="") {
					continue;
					//o slurm repete o jobid para os subprocs, mas sem inficar a particao
				}

                jobsArray.push( {
                    id:         job[0],
                    age:        job[1],
                    state:      job[2]
                });
            }
            return jobsArray;
        }
        else {
			PubSub.publish(LogOpt.vshpc, `> getUpdateJobs: Algo errado ao retornar os jobs. Código: ${ret.code} stdout: ${ret.stdout} stderr: ${ret.stderr}`);
			return [];
		}
    } catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
        PubSub.publish(LogOpt.vshpc,`> getUpdateJobs: ${msg}`);
        return [];
    }
};

/**
 * Formata os jobs para aparecer no virtual doc
 * @param jobs
 * @returns
 */
export function formatJobs(jobs: JobArrayType[] | null): string {

	if (jobs === null || jobs.length === 0) {return `Nenhum job encontrado ( ${new Date()})`;};
	let formattedJob = [];
	let uri : vscode.Uri;
	for (let index in jobs) {
		let jobAr = jobs[index];
		formattedJob.push( `ID: ${jobAr.id}. 📁: ${jobAr.name}.  📡: ${jobAr.state}. ⏲️:${jobAr.age}. 💰: ${jobAr.account}.` +
			` 🧜: ${jobAr.partition}. 🖥️: ${jobAr.nodes}. 👉: "${jobAr.command}"`);
	}
	return formattedJob.join('\n').concat('\n');
}

export async function killJob(settings: SettingsType, id: string): Promise<RetMsg> {
    PubSub.publish(LogOpt.vshpc,`> killJob: Tentando matar ${id}`);
    let ret = await sendSSHcommand(`scancel ${id}`,[''],settings.cluster,settings.user,settings.passwd, settings.privRsaKey);
    if (ret) {
        PubSub.publish(LogOpt.vshpc,`> KillJob: ${ret.code}`);
        if (ret.code === 0) {return {success: true, message: ret.stdout};}
        else {return {success: false, message: ret.multiline? ret.multiline.join(' '):ret.stderr};}
    }
    return { success: false, message: "Erro ao matar job"};
}

