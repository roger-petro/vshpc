import path = require('path');
import * as PubSub from 'pubsub-js';
import { RetMsg, SettingsType, LogOpt, SubmitOption, Simulator } from './types';
import { sendSSHcommand } from './ssh2';
import { scpWrite } from './scp2';
import { Repository } from './repository';
import { evaluatePath } from './path';
import { checkRemoteFile, checkRemoteGitVersion, gitActions } from './git';
import { sprintf } from 'sprintf-js';

// dryMode não manda o comando para o cluster, mas faz todo o restante.

export function stringInterpol(str: string, params: any): string {
    const parses = str.match(/\{\w+\}/g);
    if (parses) {
        parses.forEach(element => {
            switch (element) {
                case '{projectDir}':
                    str = str.replace('{projectDir}', params.chdir);
                case '{user}':
                    str = str.replace('{user}', params.user);
                case '{modelDir}':
                    str = str.replace('{modelDir}', params.destination);
            }
        });
    }
    return str;
}

/**
 * Remove a pasta .git e cria o comentário
 * @param settings
 * @param repo
 */
async function removeDotGit(settings: SettingsType, repo: Repository) {
    const gitdir = repo.getRemoteClonePath() + '/.git';
    const cmd = ` [ -d ${gitdir} ] && rm -rf  ${gitdir};`;
    PubSub.publish(LogOpt.progress, 'Removendo a pasta .git do clone');
    PubSub.publish(LogOpt.vshpc, '> removeAndComment: removendo a pasta .git no destino');
    const ret = await sendSSHcommand(
        cmd,
        [],
        settings.cluster,
        settings.user,
        settings.passwd,
        settings.privRsaKey,
    );
    if (ret.code === 0) {
        PubSub.publish(LogOpt.vshpc, '> removeAndComment: pasta .git no destino removida');
    }
}

async function exportRepoInfo(settings: SettingsType, location: string, repo: Repository) {
    const cloneInfo = {
        projectName: repo.getProjectName(),
        uri: repo.getGitServer(),
        branch: repo.getBranchName(),
        tag: repo.getTag(),
        hash: repo.getHash('full'),
        shortHash: repo.getHash(8),
        remotePath: repo.getRemotePath(),
        remoteClonePath: repo.getRemoteClonePath(),
        commitComment: repo.getCommitComment(),
        userName: repo.getCommitUserName(),
        userEmail: repo.getCommitUserMail(),
        day: repo.getCommitData(),
        hour: repo.getCommitHour(),
    };
    const commentFile = location + '/commit.json';
    await scpWrite(
        JSON.stringify(cloneInfo, null, 2),
        commentFile,
        settings.cluster,
        settings.user,
        settings.passwd,
        settings.privRsaKey,
    );
}

/**
 * Identifica se a pasta remota existe, onde serão
 * feitas as operações clones.
 *
 * Se não existir, executa as operações git (gitActions)
 *
 * Se existir opera a simulação com o que
 * já existe lá.
 * @param settings
 * @param option
 * @param repo
 * @returns
 */
export async function tryClone(
    settings: SettingsType,
    option: SubmitOption,
    repo: Repository,
): Promise<RetMsg> {
    try {
        if (repo.getIsRemoteClonePath()) {
            PubSub.publish(
                LogOpt.vshpc,
                `> tryClone: Existe o caminho ${repo.getRemoteClonePath()},` +
                    ' A simulação irá transcorrer com os dados já clonados',
            );
            return {
                success: true,
                message: 'A simulação irá transcorrer com os dados já clonados',
            };
        } else {
            PubSub.publish(
                LogOpt.vshpc,
                '> tryClone: remoteFolder remote NÂO existia,' +
                    ' então será feito clone e checkout para o branch corrente no workdir do vscode',
            );

            let ret = await gitActions(settings, option, repo);
            //em tese não preciso esperar o comando abaixo terminar
            removeDotGit(settings, repo);
            return ret;
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        PubSub.publish(LogOpt.vshpc, '> Algo errado com o ssh ou git');
        return { success: false, message: 'Algo errado com o git: ' + msg };
    }
}

/**
 * Realiza o envio do job, comandando as operações git se necessárias.
 * @param model modelo com caminho local
 * @param settings
 * @param option tipo de operação a ser realizada
 * @param dryMode não submete de fato o job se true
 * @returns
 */
export async function submit(
    model: string,
    settings: SettingsType,
    option: SubmitOption,
    dryMode: boolean,
    repo: Repository | null,
): Promise<RetMsg> {
    if (dryMode) {
        PubSub.publish(LogOpt.vshpc, '> submit: Submit no modo DRY MODE');
    }
    model = model.replace(/\\/g, '/');

    if (
        settings.user === '' ||
        (settings.passwd === '' && settings.privRsaKey === '') ||
        settings.cluster === '' ||
        Object.keys(settings.pathMapping).length === 0 ||
        settings.solverName === 'none' ||
        settings.solverVersion === 'none'
    ) {
        return {
            success: false,
            message: 'Configure antes em settings os dados para simulação (veja o log)',
        };
    }

    const simulator = settings.customConfig.simulators.find(item =>
        item.solvers.find(sol => sol === settings.solverName),
    ) as Simulator;
    if (!simulator) {
        PubSub.publish(LogOpt.vshpc, `> jobSubmit: Especificação para o simulador não encontrada`);
        return {
            success: false,
            message: 'Especificação para o simulador não encontrada',
        };
    }

    let remotePath = '';

    const params = {
        jobComment: '',
        chdir: '',
        jobName: '',
        jobStdOut: '',
        jobStdErr: '',
        modelURI: '',
        modelBaseName: '',
        modelExtension: '',
        solverNodes: settings.solverNodes,
        solverCores: settings.solverCores,
        ntasksPerNode: settings.ntasksPerNode,
        mpiExtras: settings.mpiExtras,
        mpiNp: '-np ' + String(settings.solverNodes * settings.ntasksPerNode),
        account: settings.account,
        slurm: settings.slurm,
        sbatch: settings.sbatch,
        solverName: settings.solverName,
        solverVersion: settings.solverVersion,
        solverExtras: settings.solverExtras,
        scriptURI: '',
        profile: 'source /etc/profile',
        logFile: '', //usado pelo solverbr

        //usado para logar no mongodb
        user: settings.user,
        hash: '', //usado também para colocar no jobComment se exisitir
        jobid: 0,
        sentAt: new Date(),
    };

    params.jobName = path.basename(model);
    params.jobStdOut = path.basename(model).split('.')[0] + '.log';
    params.jobStdErr = path.basename(model).split('.')[0] + '.err';

    await checkRemoteGitVersion(settings);

    if (repo && option === SubmitOption.git) {
        if (!repo.getRemotePath()) {
            PubSub.publish(
                LogOpt.vshpc,
                "Não foi possível determinar o folder de destino. Veja o 'de-para'",
            );
            return {
                success: false,
                message: "Não foi possível determinar o folder de destino. Veja o 'de-para'",
            };
        }

        PubSub.publish(
            LogOpt.vshpc,
            `> submit: Pasta calculada pelo evaluatePath: ${repo.getRemotePath()}`,
        );

        if (repo.getIsLocalRepo() && !repo.getIsLocalRootRepo()) {
            PubSub.publish(
                LogOpt.vshpc,
                `> submit: Abra no VSCode o projeto na pasta raiz do repositório`,
            );
            return {
                success: false,
                message: 'Abra o projeto na pasta raiz do repositório',
            };
        }

        if (!repo.getIsLocalRepo()) {
            return {
                success: false,
                message:
                    'A simulação com git clone ou pull só pode ser' +
                    'realizada em projetos controlados por git',
            };
        }

        PubSub.publish(LogOpt.vshpc, '> submit: Tratando como repositório');

        if (!repo.getHash(8)) {
            PubSub.publish(LogOpt.vshpc, `> submit: Não foi possível pegar o hash`);
            return { success: false, message: 'Falha ao capturar o hash do commit' };
        }

        params.hash = repo.getHash('full');

        if (!repo.getProjectName()) {
            PubSub.publish(
                LogOpt.vshpc,
                `> submit: Nome do projeto não podere ser determinados. Saindo.`,
            );
            return {
                success: false,
                message: 'Nome do projeto não podere ser determinado',
            };
        }

        PubSub.publish(LogOpt.vshpc, `> submit: Project name ${repo.getProjectName()}`);

        PubSub.publish(
            LogOpt.vshpc,
            `> submit: Path para onde será realizada a simulação:` +
                ` ${repo.getRemoteClonePath()}, Project name: ${repo.getProjectName()}`,
        );

        // if (currentOperations.find(e =>  e === repo.getHash('full'))) {
        //     return { success: false, message: 'Está em curso uma outra operação para este checkout' };
        // }
        // currentOperations.push(repo.getHash('full'));
        PubSub.publish(LogOpt.progress, `Tentando fazer um clone/checkout para pasta de destino`);
        let ret = await tryClone(settings, option, repo);
        //remove do hash da operação
        // currentOperations = currentOperations.filter(e => e !== repo.getHash('full'));

        PubSub.publish(
            LogOpt.vshpc,
            `> submit: Resultado do tryClone: ${ret.success ? 'Sucesso' : 'Erro'}`,
        );
        PubSub.publish(LogOpt.vshpc, `> submit: Mensagem de retorno: ${ret.message}`);
        if (ret.success === false) {
            return { success: false, message: 'tryClone:' + ret.message };
        }

        remotePath = repo.getRemoteClonePath();

        // ajuste dos parâmetros que serão interpolados no comando de submissão
        if (model.length < 3) {
            return { success: false, message: 'Modelo tem nome curto' };
        }
        if (model[0] === '/') {
            model = model.substring(1);
        }

        params.chdir = path.parse(`${repo.getRemoteClonePath()}/${model}`).dir;
        //[params.jobName] = model.split('/').slice(-1);
        //params.jobName = model.replace(/\//g, '_') + '.' + `${repo.getHash(8)}`;
        params.modelURI = repo.getRemoteClonePath() + '/' + model;
    }

    if (
        option === SubmitOption.direct ||
        option === SubmitOption.oneStep ||
        option === SubmitOption.check
    ) {
        let remoteFolder = evaluatePath(settings);
        if (remoteFolder) {
            remotePath = remoteFolder;
            if (model.length < 3) {
                return { success: false, message: 'Modelo tem nome curto' };
            }
            if (model[0] === '/') {
                model = model.substring(1);
            }
            params.chdir = path.parse(`${remoteFolder}/${model}`).dir;
            //[params.jobName] = model.split('/').slice(-1);
            params.modelURI = remoteFolder + '/' + model; //`${path.parse(`${remoteFolder}/${model}`).dir}/${model}`;
            if (option === SubmitOption.oneStep) {
                params.solverExtras += ' -onestep';
            }
            if (option === SubmitOption.check) {
                params.solverExtras += ' -checkonly';
                params.solverCores = 1;
                params.solverNodes = 1;
            }
            const ret = await checkRemoteFile(settings, params.modelURI);
            if (ret.success === false) {
                return ret;
            }
        }
    }

    //agora account pode ser vazio, em função da nuvem
    if (settings.account !== '') {
        switch (simulator.name) {
            case 'igeo':
                params.account = '--projeto ' + '"' + settings.account + '"';
                break;
            case 'geomec':
                params.account = '--projeto ' + '"' + settings.account + '"';
                if (settings.solverExtras) {
                    params.solverExtras = '--extra_args ' + '"' + settings.solverExtras + '"';
                }
                break;
        }
    }

    let script = '';
    let command = '';
    let scriptDest = `${params.chdir}/slurm.sh`;
    params.scriptURI = scriptDest;
    params.logFile = params.chdir + '/' + path.parse(model).name + '.log'; //usado pelo solverBR

    //parâmetros que são eventualmente consumidos pelos templates json
    params.modelBaseName = path.parse(params.modelURI).name;
    params.modelExtension = path.parse(params.modelURI).ext;

    if (settings.slurm.includes('-comment') || settings.slurm.includes('-coment')) {
        let commentRegex = /-?-com?ment="([^"]*)"/;
        let commentMatch = settings.slurm.match(commentRegex);
        let commentText = commentMatch ? commentMatch[1] : '';
        params.slurm = settings.slurm.replace(commentRegex, '');
        params.jobComment = 'vshpc|' + commentText.replaceAll(' ', '_');
    } else {
        params.jobComment = `vshpc|${settings.solverName}|${settings.solverVersion}`;
    }
    if (params.hash !== '') {
        /*
         * passa no jobcomment o hash do commit se a simulação for com git
         * para efeitos de identificar posteriormente outra simulação tentar rodar
         * simultâneamente para o mesmo commit e bloquear
         */
        params.jobComment += `|${params.hash}|${repo?.getGitServer()}`;
    }

    if (params.mpiExtras.includes('-np')) {
        params.mpiNp = '';
    }

    // **** gera o comando final com sprintf e interpola {\w+} com as macros previstas****
    try {
        script = sprintf(simulator.script.join('\n'), params);
        script = stringInterpol(script, params);
        command = sprintf(simulator.cmd.join(' '), params);
        command = stringInterpol(command, params);
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            message: 'Exception: ' + msg,
        };
    }

    PubSub.publish(LogOpt.vshpc, `> submit: Script de simulação:\n${script}`);
    PubSub.publish(LogOpt.vshpc, `> submit: Comando do SLURM: ${command}`);

    const sent = await scpWrite(
        script,
        params.scriptURI,
        settings.cluster,
        settings.user,
        settings.passwd,
        settings.privRsaKey,
    );
    if (!sent) {
        return { success: false, message: 'Erro no envio do script por SCP' };
    }

    /**
     * Verifica se um job com este nome já não estava rodando
     */
    let user = `-u ${settings.user}`;
    if (option === SubmitOption.git && repo && repo?.getIsDestRelative()) {
        user = '';
    }
    const outputFormat = '%A;%j;%Z';
    const cmd = `squeue ${user} --name="${params.jobName}" --format "${outputFormat}"  --sort=-V 2>/dev/null`;
    const ret = await sendSSHcommand(
        cmd,
        [''],
        settings.cluster,
        settings.user,
        settings.passwd,
        settings.privRsaKey,
    );
    if (ret && ret.code === 0 && ret.multiline !== undefined && ret.multiline.length > 1) {
        for (let i = 1; i < ret.multiline.length; i++) {
            let job = ret.multiline[i].trim().split(';');
            if (job.length === outputFormat.split(';').length) {
                const d1 = job[2];
                const d2 = path.posix.join(remotePath, path.dirname(model));
                if (d1 === d2) {
                    PubSub.publish(
                        LogOpt.progress,
                        `Já havia um job para este modelo em curso ${model}`,
                    );
                    PubSub.publish(
                        LogOpt.bar,
                        `Já havia um job para este modelo em curso ${model}`,
                    );
                    PubSub.publish(
                        LogOpt.vshpc,
                        `> sendJob: Já havia uma simulação deste modelo com este mesmo commit, em curso: ${model}`,
                    );
                    //setTimeout(() => {},4000); //para dar tempo de ler a mensagem
                    return { success: false, message: 'Já havia um job rodando' };
                }
            }
        }
    }

    if (dryMode === false) {
        PubSub.publish(LogOpt.progress, `Enviando job para o cluster`);
        //console.log(`Comando do slurm: ${command}`);
        let simulResult = await sendSSHcommand(
            command,
            [],
            settings.cluster,
            settings.user,
            settings.passwd,
            settings.privRsaKey,
        );
        if (simulResult && simulResult.code === 0) {
            let jobid = simulResult.stdout.match(/batch job ([0-9]{1,9})/);
            if (jobid && jobid.length > 0) {
                PubSub.publish(LogOpt.vshpc, `> submit: Job id: ${jobid[1]}`);
                PubSub.publish(LogOpt.vshpc, `> submit: Mensagens extras:\n${simulResult.stderr}`);
                params.jobid = Number(jobid[1]);
                if (params.hash.length > 0 && repo) {
                    exportRepoInfo(settings, params.chdir, repo);
                }
                return { success: true, message: jobid[1] };
            } else {
                return { success: false, message: 'Não consegui capturar o jobid' };
            }
        }
        if (simulResult && simulResult.code !== 0) {
            return { success: false, message: 'remote stderr: ' + simulResult.stderr };
        }
    } else {
        return { success: true, message: 'Finalizando no modo Dry' };
    }
    return { success: false, message: 'Submissão terminou com erro inesperado' };
}
