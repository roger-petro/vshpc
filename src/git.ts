import simpleGit, { CheckRepoActions, DefaultLogFields, LogResult, SimpleGit } from 'simple-git';
import * as PubSub from 'pubsub-js';
import path from 'path';
import { sendSSHcommand } from './ssh2';
import {
    SettingsType,
    RetMsg,
    LogOpt,
    SubmitOption,
    RepoType,
    GitReferencePointers,
} from './types';
import { Repository } from './repository';

import { getSettings } from './settings';

function evalGitPath() {
    const VSHPC = getSettings().customConfig;
    return VSHPC['settings']['remoteGitPath'];
}

/** pega todos os branches e tags no servidor git remoto (git ls-remote --heads --tags)
 *  observando o folder local (aberto no Workspace)
 */
export async function getRemoteReferences(localFolder: string): Promise<GitReferencePointers[]> {
    /* verifica apenas no workdir, e não no diretório ssh */
    const git: SimpleGit = simpleGit(localFolder);
    return new Promise(resolve => {
        (async git => {
            try {
                git.listRemote(['--heads', '--tags'], (err, data) => {
                    if (!err) {
                        //PubSub.publish(LogOpt.vshpc,`> checkIsRepo: isRepo? ${isRepo}, isRoot: ${isRoot}`);

                        const ar: GitReferencePointers[] = [];
                        const lines = data
                            .trim()
                            .split('\n')
                            .map(value => {
                                ar.push({
                                    sha1: value.trim().split(/\t|\s+/)[0],
                                    name: value.trim().split(/\t|\s+/)[1],
                                });
                            });

                        resolve(ar);
                    } else {
                        //console.log(JSON.stringify(data));
                        resolve([]);
                    }
                });
            } catch (e) {
                resolve([]);
            }
        })(git);
    });
}

/**
 *  Pega os branches e tags locais, para o caso de um clone feito direto
 *  do repositório (git show-ref --heads --tags), observando o folder local
 * (aberto no Workspace)
 */
export async function getLocalReferences(localFolder: string): Promise<GitReferencePointers[]> {
    /* verifica apenas no workdir, e não no diretório ssh */
    const git: SimpleGit = simpleGit(localFolder);
    return new Promise(resolve => {
        (async git => {
            try {
                git.raw(['show-ref', '--heads', '--tags'], (err, data) => {
                    if (!err) {
                        //PubSub.publish(LogOpt.vshpc,`> checkIsRepo: isRepo? ${isRepo}, isRoot: ${isRoot}`);

                        const ar: GitReferencePointers[] = [];
                        const lines = data
                            .trim()
                            .split('\n')
                            .map(value => {
                                ar.push({
                                    sha1: value.trim().split(/\t|\s+/)[0],
                                    name: value.trim().split(/\t|\s+/)[1],
                                });
                            });

                        resolve(ar);
                    } else {
                        //console.log(JSON.stringify(data));
                        resolve([]);
                    }
                });
            } catch (e) {
                resolve([]);
            }
        })(git);
    });
}

/**
 * Obtém o remote origin da configuração no .git,
 * observando o folder local (aberto no Workspace)
 * @localFolder : caminho onde tem um workspace controlado por git
 */
export async function getGitServer(localFolder: string): Promise<string> {
    const git: SimpleGit = simpleGit(localFolder);

    return new Promise(resolve => {
        (async git => {
            let server = '';
            try {
                server = await git.listRemote(['--get-url', 'origin']);
                if (!server) {
                    PubSub.publish(
                        LogOpt.vshpc,
                        '> getGitServer: Não havia servidor remoto no repositório',
                    );
                    resolve('');
                }
                //PubSub.publish(LogOpt.vshpc,`> getGitServer: Server vindo do repositório ${server.replace(/\n/g, '')}`);
                resolve(server.replace(/\n/g, ''));
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                PubSub.publish(LogOpt.vshpc, `> getGitServer: ${msg}`);
            }
        })(git);
    });
}

/** pega o nome do projeto baseado na URL git.
 * @param serverUri é a url do projeto tanto http:// quanto git@
 */
export function getGitProjectName(serverUri: string): string | null {
    let ret = path.basename(serverUri, '.git');
    if (!ret || ret.length === 0) {
        PubSub.publish(LogOpt.vshpc, '> getGitProjectName: Erro na URI');
        return null;
    } else {
        return ret;
    }
    return null;
}

/**
 * Retorna o nome do branch do repositório aberto ou HEAD. Note que quando há um detached head
 * o nome retorna HEAD, senão o nome do branch,
 * observando o folder local (aberto no Workspace).
 * Atenção: se a submissão for para um outro commit (hash), o branch ainda continuará
 * apontando para o branch aberto no workspace!
 */
export async function getBranchName(localFolder: string): Promise<string | null> {
    return new Promise(resolve => {
        (async localFolder => {
            try {
                await simpleGit(localFolder).branchLocal((err, result) => {
                    if (!err && result) {
                        //PubSub.publish(LogOpt.vshpc,`> getBranchName: ${result.current}`);
                        //console.log(JSON.stringify(result));
                        if (result.detached) {
                            resolve('HEAD');
                        }
                        resolve(result.current);
                    } else {
                        PubSub.publish(LogOpt.vshpc, `> getBranchName: ${err}`);
                        PubSub.publish(
                            LogOpt.vshpc,
                            `> getBranchName: Path solicitado ${localFolder}`,
                        );
                        resolve(null);
                    }
                });
            } catch (e) {
                resolve(null);
            }
        })(localFolder);
    });
}
/** retorna sha1 do HEAD (que pode estar detached ou não),
 * observando o folder local (aberto no Workspace)
 */
export async function getCurrentHash(localFolder: string): Promise<string> {
    const git: SimpleGit = simpleGit(localFolder);
    return new Promise((resolve, reject) => {
        (async (git, localFolder) => {
            try {
                if (!localFolder) {
                    resolve('');
                }
                //melhor opção eh usar HEAD por conta do detached
                await git.revparse(['--verify', 'HEAD'], (err, result) => {
                    if (!err) {
                        //PubSub.publish(LogOpt.vshpc,`> getCurrentHash: hash ${result.trim()}`);
                        resolve(result.trim());
                    } else {
                        //PubSub.publish(LogOpt.vshpc,`> getCurrentHash: ${err}. Folder: ${localFolder}`);
                        resolve('');
                    }
                });
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                console.error(`Capturei este catch: ${msg}`);
                console.error(`Solicitado localFolder sendo: ${msg}`);
                reject('');
            }
        })(git, localFolder);
    });
}

/**
 * Pega todos os nomes dos branches em todos os heads (pontas) que possuem
 * o hash indicado,
 * observando o folder local (aberto no Workspace) e verificando local ou remote (remote=true)
 * @remote : pega remote (--remote), se true,  ou local se false
 */
export async function getBranchesTips(
    localFolder: string,
    remote: boolean,
    hash: string,
): Promise<string[]> {
    const git: SimpleGit = simpleGit(localFolder);
    return new Promise((resolve, reject) => {
        (async (git, localFolder) => {
            try {
                if (!localFolder) {
                    resolve(['']);
                }
                let cmd = '-i';
                if (remote) {
                    cmd = '-r';
                }
                await git.raw('branch', cmd, '--contains', hash.trim(), (err, result) => {
                    if (!err) {
                        let rs: string[] = result.split(/\n|->/).map(e => e.trim());
                        if (rs && rs.length > 0 && rs[rs.length - 1] === '') {
                            rs.pop();
                        }
                        resolve(rs);
                    } else {
                        resolve(['']);
                    }
                });
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                PubSub.publish(LogOpt.vshpc, `> getBranchesTips: catch: ${msg}`);
                reject(['']);
            }
        })(git, localFolder);
    });
}

/** Retorna todos os tags que apontam para o HEAD local,
 * observando o folder local (aberto no Workspace)
 */
export async function getCurrentTags(
    localFolder: string,
    specificHash: string | null,
): Promise<string[]> {
    const git: SimpleGit = simpleGit(localFolder);
    return new Promise((resolve, reject) => {
        (async (git, localFolder) => {
            try {
                if (!localFolder) {
                    resolve(['']);
                }
                //melhor opção eh usar HEAD por conta do detached
                await git.revparse(['--verify', 'HEAD'], async (err, result) => {
                    if (!err) {
                        let point = result.trim();
                        if (specificHash) {
                            point = specificHash.trim();
                        }
                        await git.tag(['--points-at', point], (err, result) => {
                            if (!err) {
                                let rs: string[] = result.split('\n').map(e => e.trim());
                                if (rs && rs.length > 0 && rs[rs.length - 1] === '') {
                                    rs.pop();
                                }
                                resolve(rs);
                            } else {
                                resolve(['']);
                            }
                        });
                    } else {
                        resolve(['']);
                    }
                });
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                console.error(`Capturei este catch: ${msg}`);
                console.error(`Solicitado localFolder sendo: ${localFolder}`);
                reject(['']);
            }
        })(git, localFolder);
    });
}

/** Verifica se a pasta local é um repositório e se ela é o root do repositório,
 * observando o folder local (aberto no Workspace)
 */
export async function checkIsRepo(localFolder: string): Promise<RepoType> {
    /* verifica apenas no workdir, e não no diretório ssh */
    const git: SimpleGit = simpleGit(localFolder);
    return new Promise(resolve => {
        (async git => {
            try {
                const isRepo = await git.checkIsRepo();
                const isRoot = await git.checkIsRepo('root' as CheckRepoActions);
                //PubSub.publish(LogOpt.vshpc,`> checkIsRepo: isRepo? ${isRepo}, isRoot: ${isRoot}`);
                resolve({ isRepo, isRoot });
            } catch (e) {
                resolve({ isRepo: false, isRoot: false });
            }
        })(git);
    });
}

/** Obtém o log de um commit,
 * observando o folder local (aberto no Workspace)
 *  ex. git log   --date="format-local:%Y.%m.%d_%H:%M:%S" -n 1  bad0cc3a81c0ffa13534c473a72d6bf163faf373
 */
export async function getCommitLog(localFolder: string, sha1: string): Promise<string[]> {
    /* verifica apenas no workdir, e não no diretório ssh */
    const git: SimpleGit = simpleGit(localFolder);
    return new Promise(resolve => {
        (async git => {
            git.raw(
                [
                    'log',
                    '--pretty=format:%aN;%ae;%cd;%s',
                    '--date=format-local:%Y.%m.%d;%H:%M:%S',
                    '-n 1',
                    sha1,
                ],
                (error, result) => {
                    if (error) {
                        console.log(error);
                        resolve(['']);
                    }
                    resolve(result.trim().split(';'));
                },
            );
        })(git);
    });
}

/** verifica a versão do git remoto , via SSH
 * @returns boolean
 */
export async function checkRemoteGitVersion(settings: SettingsType): Promise<string> {
    const ret = await sendSSHcommand(
        `${evalGitPath()} --version`,
        [''],
        settings.cluster,
        settings.user,
        settings.passwd,
        settings.privRsaKey,
    );
    if (!ret) {
        PubSub.publish(
            LogOpt.vshpc,
            '> checkRemoteGitVer: Erro ao verificar a versão do git remoto',
        );
        return 'Erro ao fazer ssh';
    }
    if (ret) {
        PubSub.publish(LogOpt.vshpc, `> Versão do git remoto: ${ret.multiline?.join('|')}`);
    }
    if (ret && ret.code === 0) {
        return ret.stdout;
    }
    if (ret && ret.code !== 1) {
        return ret.stderr;
    }
    return 'Erro não identificado ao apurar o ssh';
}

/** verifica se a pasta remota existe, via SSH
 * @returns boolean
 */
export async function checkRemoteFolder(
    settings: SettingsType,
    remoteFolder: string,
): Promise<boolean> {
    const ret = await sendSSHcommand(
        `[ -d "${remoteFolder}" ]; echo $?`,
        [''],
        settings.cluster,
        settings.user,
        settings.passwd,
        settings.privRsaKey,
    );
    if (!ret) {
        PubSub.publish(LogOpt.vshpc, '> checkRemoteFolder: Erro ao verificar o folder');
        return false;
    }
    if (ret) {
        PubSub.publish(
            LogOpt.vshpc,
            `> checkRemoteFolder: ${remoteFolder} ` +
                `SSH code: ${ret.code === 0 ? '✔️' : '❌'}   , ` +
                `Existe?: ${ret.stdout}${ret.stdout === '0' ? '✔️' : '❌'}   ,` +
                `Mensagem de erro, se existir: ${ret.stderr || 'none'}`,
        );
    }
    if (ret && ret.code === 0 && ret.stdout === '0') {
        return true;
    }
    return false;
}

/** verifica se a um arquivo remoto existe, via SSH
 */
export async function checkRemoteFile(settings: SettingsType, remoteFile: string): Promise<RetMsg> {
    const ret = await sendSSHcommand(
        `[ -f "${remoteFile}" ]; echo $?`,
        [''],
        settings.cluster,
        settings.user,
        settings.passwd,
        settings.privRsaKey,
    );
    if (!ret) {
        PubSub.publish(LogOpt.vshpc, '> checkRemoteFile: Erro ao executar o ssh');
        return {
            success: false,
            message: 'engine ssh fail',
        };
    }
    if (ret) {
        PubSub.publish(
            LogOpt.vshpc,
            `> checkRemoteFile: ${remoteFile} ` +
                `SSH code: ${ret.code}${ret.code === 0 ? '✔️' : '❌'}   , ` +
                `Arquivo Existe?: ${ret.stdout}${ret.stdout === '0' ? '✔️' : '❌'}   , ` +
                `Códigos de erros vistos Erro: ${ret.stderr || ret.stdout}`,
        );
    }
    if (ret && ret.code === 0 && ret.stdout === '0') {
        return { success: true, message: 'remote file found' };
    }
    if (ret && ret.code === 0 && ret.stdout === '1') {
        return { success: false, message: 'remote file does not exists' };
    }
    return { success: false, message: 'remote ' };
}

/** Realiza as operações de git clone, shallow clone
 * ou clone local, via SSH
 */
export async function gitActions(
    settings: SettingsType,
    option: SubmitOption,
    repo: Repository,
): Promise<RetMsg> {
    if (repo.getRemotePath() === repo.getRemoteClonePath()) {
        PubSub.publish(
            LogOpt.vshpc,
            '> gitActions: Por proteção não é possível fazer pull sobre o diretório de trabalho',
        );
        return { success: false, message: 'Pull nesta condição é proibido' };
    }

    try {
        const hash = repo.getHash('full');

        if (!hash) {
            return { success: false, message: 'Branch não encontrado' };
        }

        //let remoteBranchTip = repo.feasibleTag();
        let gitURI = repo.getGitServer();
        // versão do git 1.8 não tem a opção -b para fazer checkout automático para um branch
        let cmd: string = '';

        if (gitURI.length === 0) {
            return { success: false, message: 'URI do projeto não pode ser determinada' };
        }

        if (option === SubmitOption.git) {
            PubSub.publish(
                LogOpt.vshpc,
                `> gitActions: Tentando um Clone na pasta ${repo.getRemoteClonePath()}`,
            );

            const remotePath = repo.getRemoteClonePath();

            let cloneURI = repo.getRemotePath();
            //eventualmente o camarada pode estar trabalhando em um drive local,
            //então o clone é feito do servidor
            if (!repo.getIsRemotePath()) {
                cloneURI = repo.getGitServer();
            }

            // `[ ! -d ${remotePath} ] && mkdir -p ${remotePath} && ` +
            // ` cd ${remotePath} && ` +
            // ` ${evalGitPath()} clone ${cloneURI} ${remotePath} && ` +
            // ` ${evalGitPath()} checkout --detach ${hash}`; //-b ${branch}

            cmd = `if [ -d "${remotePath}" ]; then
                        echo "Erro: o diretório ${remotePath} já existe."
                        exit 1
                    fi
                    mkdir -p "${remotePath}" || {
                        echo "Erro: falha ao criar o diretório ${remotePath}."
                        exit 2
                    }
                    cd "${remotePath}" || {
                        echo "Erro: não foi possível acessar ${remotePath}."
                        exit 3
                    }
                    ${evalGitPath()} clone "${cloneURI}" . || {
                        echo "Erro: falha ao clonar ${cloneURI} em ${remotePath}."
                        exit 4
                    }
                    ${evalGitPath()} checkout --detach "${hash}" || {
                        echo "Erro: falha ao dar checkout do hash ${hash}."
                        exit 5
                    }
                    `;
        }

        PubSub.publish(LogOpt.vshpc, `> gitActions: ${cmd}`);

        let ret = await sendSSHcommand(
            cmd,
            [],
            settings.cluster,
            settings.user,
            settings.passwd,
            settings.privRsaKey,
        );

        if (ret && ret.code === 0) {
            //apaguei o sufixo .git aqui para verificar o caminho
            let created = await checkRemoteFolder(settings, `${repo.getRemoteClonePath()}/.git`);

            if (created === true) {
                if (option === SubmitOption.git) {
                    PubSub.publish(LogOpt.progress, `Realizadas eventuais operações de git 🙂`);
                }
                PubSub.publish(LogOpt.vshpc, `> gitActions: Resultado das operações git abaixo:`);
                PubSub.publish(
                    LogOpt.vshpc,
                    `> gitActions: código: ${ret.code} mensagem: ${ret.stdout}`,
                );
                PubSub.publish(LogOpt.vshpc, `> gitActions: Mensagens extras:\n${ret.stderr}`);
                return { success: true, message: ret.stdout };
            } else {
                PubSub.publish(
                    LogOpt.vshpc,
                    `> gitActions: O git falhou em criar a pasta com clone.`,
                );
                PubSub.publish(LogOpt.vshpc, `> gitActions: Mensagens extras:\n${ret.stderr}`);
                PubSub.publish(
                    LogOpt.progress,
                    `O git falhou em criar a pasta com clone. Veja os logs`,
                );
                return { success: false, message: 'Erro ao clonar na pasta remota' };
            }
        }
        if (ret && ret.code > 0) {
            let message = '';
            switch (ret.code) {
                case 1:
                    message = 'Pasta de destino do clone já existe, favor remover.';
                    break;
                case 2:
                    message = `Erro: falha ao criar o diretório para o git (falta permissão?)`;
                    break;
                case 3:
                    message = `O diretório remote não me concedeu permissão`;
                    break;
                case 4:
                    message = `Falha ao executar o clone`;
                    break;
                case 5:
                    message = `Falha ao dar checkout no commit`;
            }
            PubSub.publish(
                LogOpt.vshpc,
                `> gitActions: Erro! código: ${ret.code}, message: ${message}`,
            );
            PubSub.publish(LogOpt.vshpc, `> gitActions: Mensagens extras:\n${ret.stderr}`);
            return { success: false, message: message };
        }
        PubSub.publish(
            LogOpt.vshpc,
            `> gitActions: Erro! SSH não me retornou nada. Talvez problema de conexão`,
        );
        return { success: false, message: 'Erro ao retornar do SSH' };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        PubSub.publish(LogOpt.vshpc, `> gitCheckout: Capturada except: ${msg}`);
        return { success: false, message: msg };
    }
}
