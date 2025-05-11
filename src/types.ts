export class CustomError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CustomError';
    }
}

export interface PathMapping {
    [windows: string]: string;
}

const PKG = require('../package.json');
export const APP_NAME = PKG['name'];

export type SettingsType = {
    user: string;
    passwd: string;
    privRsaKey: string;
    cluster: string;
    usePassword: boolean;
    pathMapping: PathMapping;
    destination: string;
    folderFormat: string;
    solverName: string;
    solverVersion: string;
    account: string;
    slurm: string;
    solverExtras: string;
    solverCores: number;
    ntasksPerNode: number;
    mpiExtras: string;
    solverNodes: number;
    workdir: string;

    webviewHistSize: number;
    webviewJobsSize: number;
    sbatch: string;
    customConfig: CustomConfig;
};

export type SSHMsg = {
    code: number;
    stderr: string;
    stdout: string;
    multiline?: string[];
};

export type RetMsg = {
    success: boolean;
    message: string;
};

/**
 * Informação dos jobs em serviço no cluster
 */
export type JobArrayType = {
    id: string; // 0 id;
    age: string; // 1 tempo_execução(days-hours:minutes:seconds); => age
    nodes: string; // 2 nos_usados;
    partition: string; // 3 partition;
    state: string; // 4 state(formato_extendido)
    startTime: string; // 5 data_inicio;
    command: string; // 6 comando executado
    account: string; //7 account
    name: string; //8 jobname
    user: string; //nome do usuário
    cores: string; //num de cpus usadas
    cluster: string; //fixo em "reservatório"
    work_dir: string; //fixo em uma mensagem, veja getJobs
    qos: string; //qos do job
    comment: string;
};

/**
 * informações sobre o job que vai ser enviado
 * e eventualmente ficar na fila até o envio dos anteriores
 */
export type JobQueueElement = {
    model: string;
    specificHash: string | null;
    submitOption: SubmitOption;
};

export type RepoType = {
    isRepo: boolean;
    isRoot: boolean;
};

export enum LogOpt {
    toast = 'vshpc/TOAST_INFO',
    toast_error = 'vshpc/TOAST_ERROR',
    vshpc = 'vshpc/LOG',
    bar = 'vshpc/STATUS_BAR',
    progress = 'vshpc/PROGRESS',
    console = 'vshpc/CONSOLE',
    dismissable = 'vshpc/DISMISSABLE',
}

export enum Verbosity {
    none,
    low,
    high,
}

export enum SubmitOption {
    git,
    direct,
    oneStep,
    check,
}

export type GitReferencePointers = {
    sha1: string;
    name: string;
};

export type Params2Interpolate = {
    projectName: string;
    user: string;
    solver: string;
    branch?: string;
    data?: string;
};

export type WorkspaceModelFolder = {
    model: string;
    path: string;
    workspaceindex: number;
};

/**
 * configuração do vshpc.json
 * quanto aos simuladores
 */
export type Simulator = {
    name: string;
    defaultSolverExtras: string;
    defaultSolverVersion: string;
    verRegexpClass?: string;
    defaultSlurm: string;
    solvers: string[];
    ext: string;
    progressScript: string;
    scriptDirPrefix: string;
    sbatch: string;
    script: string[];
    cmd: string[];
};

/**
 * configuração do vshpc.json
 */
export type CustomConfig = {
    settings: {
        version: string;
        specHash: string;
        dryMode: boolean;
        defaultFolderFormat: string;
        remoteGitPath: string;
        defaultCluster: string;
        defaultPrivRSAKey: string;
        defaultLinuxPrivRSAKey: string;
        defaultSlurmAccount: string;
        defaultWindowsUnix: Record<string, string>;
        defaultUnixMapping: Record<string, string>;
        defaultUnixWindows: Record<string, string>;
        defaultUnixReverseMapping: Record<string, string>;
        solverNames: Record<string, string>;
        elasticSearchAPI: string;
        graphanaAPI: string;
        userSearchSite: string;
    };
    ux: Record<string, any>;
    simulators: Simulator[];
};

export const FolderFormats = {
    'YYYY.MM.DD_hash_projectName': '%(yyyymmdd)s_%(hash)s_%(projectName)s',
    'YYYY.MM.DD_projectName_hash': '%(yyyymmdd)s_%(projectName)s_%(hash)s',
    'YYYY.MM.DD_tag_hash_projectName': '%(yyyymmdd)s_%(tag)s_%(hash)s_%(projectName)s',
    'YYYY.MM.DD_projectName_tag_hash': '%(yyyymmdd)s_%(projectName)s_%(tag)s_%(hash)s',
    'YYYY.MM.DD_projectName_hash_tag': '%(yyyymmdd)s_%(projectName)s_%(hash)s_%(tag)s',
    projectName_hash: '%(projectName)s_%(hash)s',
    projectName_tag_hash: '%(projectName)s_%(tag)s_%(hash)s',
    'projectName_YYYY.MM.DD_hash': '%(projectName)s_%(yyyymmdd)s_%(hash)s',
    'projectName_YYYY.MM.DD_hash_tag': '%(projectName)s_%(yyyymmdd)s_%(hash)s_%(tag)s',
    'projectName_YYYY.MM.DD_tag_hash': '%(projectName)s_%(yyyymmdd)s_%(tag)s_%(hash)s',
};


export type SingleJobProgress = {
    jobid: string;
    progress: number;
}


