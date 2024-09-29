import { evaluatePath } from './path';
import {
    getGitServer,
    getBranchesTips,
    checkRemoteFolder,
    getRemoteReferences} from './git';
import { Repository } from './repository';
import { sendSSHcommand } from './ssh2';
import { getSettings } from './settings';


const checks = {
    sshUser: '- Acesso SSH via senha: Falhou',
    sshKey: '- Acesso SSH via chave: Falhou',
    checkLocalAccess : '- Acesso ao GitLab pela máquina local: Falhou',
    checkRemoteAccess: '- Acesso GitLab à partir do cluster: Falhou!',
    remotePath: '- Caminho Remoto: Desconhecido',
    remotePathExists: '- Caminho Remoto Existe?: Não',
    isRootFolder: '- Pasta aberta na raiz do projeto: (avaliado apenas se tiver controlado por git)',
    git: '- Pasta controlado por git: Falso',
    gitServer: '- Servidor do Git: Desconhecido',
    hash: '- Hash do projeto: Desconhecido',
    project: '- Nome do Projeto: Desconhecido',
    tag: '- Tags: Nenhuma',
    branchName: '- Branch Name: Desconhecido',
    branchTips :'- Branches e tags no topo deste commit: Desconhecido',
    gitDestinationEnd: '- Pasta final de destino do git: Desconhecido',
    gitDestinationEndExists: '- Pasta final de destino do git existe: Não verificado'
    //gitUser: ' - Git user: desconhecido',
    //gitEmail: ' - Git email: desconhecido'
};


export let formattedSettings: string;

export function precheck() {
    formattedSettings = '';
    const settings = getSettings();
    for (let item in settings) {
        const value = print(item, (settings as any)[item]);
        formattedSettings = formattedSettings + value + '\n';
    }
    formattedSettings = formattedSettings + '\n' + 'Aguarde o restante do relatório....' + '\n\n';
}


export async function check() {


    await checkAsyncs();

    for (let key in checks) {
        formattedSettings = formattedSettings + (checks as any)[key] + '\n';
    }
    formattedSettings = formattedSettings + '\n' + 'Relatório finalizado' + '\n';
}

async function checkAsyncs() {
    const settings = getSettings();
    const repo = new Repository(settings, "");
    const metaData = await Promise.all(
        [
            sendSSHcommand('pwd',[],settings.cluster,settings.user, settings.passwd,''),
            sendSSHcommand('pwd',[],settings.cluster,settings.user,'',settings.privRsaKey),
            repo.getLocalMetaData(null),
            getRemoteReferences(settings.workdir)
        ]
    );
    checks.sshUser = `- SSH por senha: ${metaData[0].code === 0 ? 'OK!': 'Falhou'}`;
    checks.sshKey = `- SSH por chave: ${metaData[1].code === 0 ? 'OK!': 'Falhou'}`;

    let getRemote = false;
    if (metaData[2] === true )  {
        getRemote = await repo.getRemoteMetaData();
    }
    if (repo.getIsLocalRepo() === true) {
        checks.git  = `- Projeto controlado pelo git: ${repo.getIsLocalRepo() ? 'Sim': 'Não'}`;
        checks.isRootFolder = `- Pasta aberta na raiz do projeto: ${repo.getIsLocalRootRepo()? 'Sim': 'Não'}`;
        checks.gitServer = `- Projeto no git: ${repo.getGitServer()}`;
        checks.project = `- Nome do projeto: ${repo.getProjectName()}`;
        checks.hash = `- Hash atual do projeto: ${repo.getHash(8)}`;
        checks.branchName = `- Branch Name: ${repo.getBranchName()}`;
        checks.tag = `- Tags do checkout atual: ${repo.getTag() === "0"? "Nenhuma": repo.getTag()}`;
        checks.gitDestinationEnd = `- Local de destino das operações git: ${repo.getRemoteClonePath()}`;
        checks.remotePathExists = `- Existe o caminho do projeto visto pelo Linux: ${repo.getIsRemotePath()? 'Sim': 'Não'}`;
        checks.remotePath = `- Caminho do projeto visto pelo Linux: ${repo.getRemotePath() ? repo.getRemotePath(): 'Erro! Verifique se o "de-para" contempla a pasta do projeto aberta' }`;    
        const remotes = metaData[3];
        if (remotes.length > 0) {
            checks.checkLocalAccess = '- Acesso ao GitLab à partir da máquina local: OK!';
        }
        checks.branchTips = '- Branches e tags no topo deste commit: ' +
            (await getBranchesTips(settings.workdir,false,repo.getHash('full'))).join(' ');
        checks.gitDestinationEndExists = '- Pasta final de destino do git existe: ' + (repo.getIsRemoteClonePath() ? "OK!" : "Não existe");

    }
    else { //projeto não tem git
        let remoteFolder = evaluatePath(settings);
        let exist = false;
        checks.remotePath = `- Caminho do projeto visto pelo Linux: ${remoteFolder ? remoteFolder: 'Erro! Verifique se o "de-para" contempla a pasta do projeto aberta' }`;
        checks.remotePathExists = '- Existe o caminho do projeto visto pelo Linux: ';
        if (remoteFolder) {
            exist = await checkRemoteFolder(settings,remoteFolder);
        }
        checks.remotePathExists += exist ? "Sim": "Não";
    }

    if (metaData[0].code === 0 || metaData[1].code === 0) {
        const gitserver = await getGitServer(settings.workdir);
        const testRemote = await sendSSHcommand('git ls-remote --exit-code -h ' + gitserver,[],
        settings.cluster,settings.user, settings.passwd,settings.privRsaKey);
        if (testRemote.code === 0) {
            checks.checkRemoteAccess = `- Acesso ao GitLab pelo cluster: OK!`;
        }
        else {
            checks.checkRemoteAccess = '- Acesso ao GitLab pelo cluster: ERRO! ' +
            ` Veja a configuração das chaves RSA no Master node do cluster(${settings.cluster}), ou \n` +
            ' Falta aceitar a chave RSA do git server estando dentro do master node (faça um ssh "na mão" do cluster para o git server), ou \n'+
            ' Sua chave RSA não foi colocada na sua conta no git server';
        }
    }
}

function print(key :string, value: any) : string {
    let newKey = key;
    switch (key) {
        case 'user' :
            newKey = 'Usuário';
            break;
        case 'passwd' :
            newKey = 'Password';
            break;
        case 'cluster' :
            newKey = 'Nome do cluster';
            break;
        case 'privRsaKey':
            newKey = "Chave Privada";
            break;
        case 'windowsUnix' :
            newKey = 'De-Para';
            break;
        case 'destination' :
            newKey = 'Pasta de destino do clone e simulação';
            break;
        case 'useProjectFolder' :
            newKey = 'Usar clones dentro da pasta do projeto';
            break;
        case 'folderFormat' :
            newKey = 'Formato da pasta clonada';
            break;
        case 'slurm' :
            newKey = 'Parâmetros para o SLURM (slurm)';
            break;
        case 'solverExtras' :
            newKey = 'Parâmetros para o Solver (solveExtras)';
            break;
        case 'solverName' :
            newKey = 'Nome do simulador (solverName)';
            break;
        case 'solverVersion' :
            newKey = 'Versão do simulador (solverVersion)';
            break;
        case 'account' :
            newKey = 'Conta (--account)';
            break;
        case 'solverCores' :
            newKey = 'Número de cores (solverCores)';
            break;
        case 'solverNodes' :
            newKey = 'Número de nós (solverNodes)';
            break;
        case 'workdir' :
            newKey = 'Pasta de trabalho atual (workdir)';
    }
    if (value === '') {
        value = 'Não preenchido';
    }
    if (typeof value === 'object') {
        value = JSON.stringify(value, null, 2);
    }
    if (value === false) {
        value = 'Não';
    }
    if (value === true) {
        value = 'Sim';
    }
    return `${newKey}: ${value}`;
}