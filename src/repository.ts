/*
* Objeto com os dados do repositório aberto ou desejado
* captura informações locais e depois do repositório remoto associado
*/

import * as PubSub from 'pubsub-js';
import * as path from 'node:path';
import { sprintf } from 'sprintf-js';

import {evaluatePath} from './path';
import { LogOpt, SettingsType, GitReferencePointers } from './types';
import {
    getGitProjectName,
    getGitServer,
    checkIsRepo,
    getCurrentHash,
    getCurrentTags,
    getBranchesTips,
    getBranchName,
    checkRemoteFolder,
    getLocalReferences,
    getCommitLog
} from './git';



export class Repository {
    protected settings: SettingsType;

    protected gitServer: string; //URI do repositório git
    protected branchName: string|null; //branch atual do repositório aberto (pode ser HEAD)
    protected projectName: string|null; //tirado da URI git
    protected currentHash: string; //full length do SHA-1 do checkout corrente
    protected isDetached: boolean; //diz se é detached ou não
    protected tags: string[]; //tags existentes no checkout corrente

    protected isLocalRepo: boolean;
    protected isLocalRootRepo: boolean;
    protected isDestinationRelative: boolean;
    protected remoteProjectPath: string|null; //caminho no cluster saído do "de-para"
    protected isRemoteProjectPath: boolean; //diz se existe o remotePath
    //protected isRemotePathRepo: boolean; //diz se remotePath é um repositório

    protected remoteClonePath : string; //caminho de saída da simulação calculado em função se eh git e do hash
    protected isRemoteClonePath: boolean; //verifica de o destino do clone existe, identificando também se há uma pasta .git nela

    protected branchTips: string[]; // no formato origin/HEAD, origin/master etc, pego do repositório local
    protected localReferences: GitReferencePointers[]; //referencias --heads e --tags do repositório local

    protected commitLog: string[]; //o log do commit corrente

    constructor(settings: SettingsType, hash : string) {
        this.settings = settings;
        this.projectName = "";
        this.gitServer = "";
        this.branchName = "";
        this.currentHash = "";
        this.isDetached = false;
        this.tags = [];
        this.isLocalRepo = false;
        this.isLocalRootRepo = false;
        this.isDestinationRelative = false;

        this.remoteProjectPath = "";
        this.isRemoteProjectPath = false;
        //this.isRemotePathRepo = false;

        this.remoteClonePath = "";
        this.isRemoteClonePath = false;

        this.branchTips = [];
        this.localReferences = [];

        this.commitLog = [''];
        this.currentHash = hash;
    }
    /** Coleta informações do repositório,
     * observando o folder local (aberto no Workspace)
     * @returns
     */
    async getLocalMetaData (specificHash: string| null): Promise<boolean> {
        const checkRepo = await checkIsRepo(this.settings.workdir);

        this.isLocalRepo = checkRepo.isRepo;
        this.isLocalRootRepo = checkRepo.isRoot;
        this.isDestinationRelative = false;

        if (checkRepo.isRepo) {
            const metaData = await Promise.all(
                [
                    getGitServer(this.settings.workdir),
                    getBranchName(this.settings.workdir),
                    getCurrentTags(this.settings.workdir, specificHash),
                    getLocalReferences(this.settings.workdir),
                ]
            );
            this.gitServer = metaData[0];
            this.branchName = metaData[1];
            this.isDetached = this.branchName === "HEAD"? true: false;
            this.tags = metaData[2];
            this.localReferences = metaData[3];

            /**
             * Atenção que o branchName vai apontar para o projeto aberto
             */
            if (specificHash){
                this.currentHash = specificHash;
            } else {
                this.currentHash = await getCurrentHash(this.settings.workdir);
            }

            this.projectName = getGitProjectName(this.gitServer);
            if (this.projectName === 'origin') {
                PubSub.publish(LogOpt.vshpc,'LogOpt.vshpc, `> getLocalMetaData: Não há ainda um repositório remoto vinculado no git config');
                this.projectName = path.basename(this.settings.workdir);
            }

            const metadata2 = await Promise.all([
                getBranchesTips(this.settings.workdir, false, this.currentHash),
                getCommitLog(this.settings.workdir, this.currentHash)
            ]);

            this.branchTips = metadata2[0];
            this.commitLog = metadata2[1];

            PubSub.publish(LogOpt.vshpc, `> getLocalMetaData: Executado`);
            return true;
        }
        return false;
    }
    /** Realiza: calcula o path remoto; verifica se ele existe (SSH);
     * e verifica se neste path remoto exite a pasta.
     * Por fim, calcular o path de destino para ser usado nas operações git via SSH.
     * Deve ser chamado depois de getLocalMetaData, se retornar true desta chamada
     * originados do evaluatePath
     * @returns true se a pasta remota já existe e contém um git, false se não contém git ou não existe
     */
    async getRemoteMetaData(): Promise<boolean> {

        this.calcPath();

        if (this.remoteProjectPath === null) {
            return false;
        }
        //antes aqui via-se se existia a pasta .git
        PubSub.publish(LogOpt.vshpc,
            `> getRemoteMetaData: Local folder: ${this.settings.workdir}. Remote Folder: ${this.remoteProjectPath}`);

        this.isRemoteProjectPath = await checkRemoteFolder(this.settings, this.remoteProjectPath);
        //this.isRemotePathRepo = await checkRemoteFolder(this.settings, `${this.remotePath}/.git`);

        //só pode ser chamado depois que determinar o caminho final
        this.isRemoteClonePath = await checkRemoteFolder(this.settings, this.remoteClonePath);

        PubSub.publish(LogOpt.vshpc,"> getRemoteMetaData: Executado");
        return this.isRemoteProjectPath;
    }

    async calcPath(){
        this.remoteProjectPath = evaluatePath(this.settings, this.settings.workdir);
        this.remoteClonePath = '';
        if (!this.remoteProjectPath) {
            PubSub.publish(LogOpt.vshpc, `> getRemoteMetaData: Local folder: ${this.settings.workdir} não pode ser determinado. Verifique o 'de-para'`);
            return '';
        }
        const dest = this.settings.destination;
        const destParsed = path.parse(dest);

        PubSub.publish(LogOpt.vshpc, `> getRemoteMetaData: Usando com valor da variável "destination" o caminho: ${dest}`);

        if (destParsed.root.search(/^\w:\\/)>-1) {
            this.remoteClonePath = evaluatePath(this.settings, dest) || this.remoteProjectPath;
        }
        if (destParsed.root==='/') {
            this.remoteClonePath = dest;
        }
        if (destParsed.root === '') {
            if (destParsed.base!=='.' && destParsed.base!=='..') {
                PubSub.publish(LogOpt.vshpc, `> getRemoteMetaData: Por ser em caminho fora da pasta irmã ou da pasta filha não será aceito outro job com mesmo nome`);
                this.isDestinationRelative = true;
            }
            let p = evaluatePath(this.settings, this.settings.workdir) || '';
            //console.log('Valor de p ' + p + ' valor do replace ' + dest.replaceAll('\\','/'));
            this.remoteClonePath = path.posix.resolve(p, dest.replaceAll('\\','/'));
        }

        PubSub.publish(LogOpt.vshpc,
            `> getRemoteMetaData: destino foi calculado ainda sem os sufixos : ${this.remoteClonePath}`);

        if (this.currentHash) {
            if (this.settings.folderFormat) {
                const template = this.settings.folderFormat;
                const params = {
                    tag : this.getTag(),
                    hash: this.getHash(8),
                    projectName: this.projectName,
                    yyyymmdd: '0000.00.00'
                };
                if (this.commitLog.length === 5 ) {
                    params.yyyymmdd = this.commitLog[2];
                }
                this.remoteClonePath = this.remoteClonePath.concat(`/${sprintf(template, params)}`);
            } else {
                this.remoteClonePath = this.remoteClonePath.concat(`/${this.projectName}_${this.getHash(8)}`);
            }
        }
    }

    getIsDestRelative() : boolean {
        return this.isDestinationRelative;
    }

    getIsLocalRepo() : boolean {
        return this.isLocalRepo;
    }

    getIsLocalRootRepo(): boolean {
        return this.isLocalRootRepo;
    }

    /**
     * Pega a pasta no destino retornada do "de-para"
     * @returns caminho de saída do "de-para"
     */
    getRemotePath(): string|null {
        return this.remoteProjectPath;
    }

    /**
     * Verifica se o path remoto existe
     * observando o que foi visto pelo getRemoteMetaData
     * @returns boolean
     */
    getIsRemotePath() : boolean {
        return this.isRemoteProjectPath;
    }

    /**
     * Retorna o caminho remoto de destino do clone
     * @returns caminho remoto onde será feito clone
     */
    getRemoteClonePath() : string {
        return this.remoteClonePath;
    }

    /**
     * Verifica se o path remoto de destino do clone existe (e tem um .git)
     * observando o que foi visto pelo getRemoteMetaData
     * @returns boolean
     */
    getIsRemoteClonePath() : boolean {
        return this.isRemoteClonePath;
    }

    /** Obtém o sha1 do checkout corrente
     * truncado ou full
     * @param size
     * @returns sha1 (string)
     */
    getHash(size:number|'full') {
        if (size==='full' || size > 40 || size === 0) {
            size=40; //sha-1 tem 40 chars
        }
        return this.currentHash.substring(0,size);
    }

    getGitServer() : string {
        return this.gitServer;
    }

    getProjectName() : string|null {
        return this.projectName;
    }

    /** Retorna o nome de tag mais
     * apropriado para gerar clones e nomes de pastas
     * @returns nome do tag ou "0"
     */
    getTag(): string {

        let tag = this.tags.find( e => e.match(/^[\d\._-]+$/));
        if (tag === undefined ) {
            tag = this.tags.find( e => e.match(/^[vV\d\._-]+$/));
        }
        if (tag === undefined ) {
            tag = this.tags.find( e => e.match(/^[PpCcSsvV\d\._-]+$/));
        }
        if (tag === undefined ) {
            tag = this.tags.find( e => e.match(/[PpCcSsvV\d\._-]/));
        }

        if (tag === undefined && this.tags.length > 0) {
            tag = this.tags[0];
        }
        else if(tag === undefined) {
            tag="0";
        }
        return tag;
    }

    /** diz se é HEAD ou não
     *
     */
    getIsDetached() : boolean {
        return this.isDetached;
    }

    /**
     * Retorna o nome do branch ou HEAD. Note que quando há um detached head
     * o nome retorna HEAD, senão o nome do branch,
     * observando o folder local (aberto no Workspace) 
     */
    getBranchName() : string | null {
        return this.branchName;
    }


    /**
     *
     * @returns Retornar todas as referencias no repositório local
     * (branches e tags), numa associação entre sha-1 e o nome
     * da referência, observando o projeto aberto no vscode
     */
    getLocalReferences() : GitReferencePointers[] {
        return this.localReferences;
    }

    /**
     * Retorna os nomes dos branches do repositório local
     * que tenham o checkout corrente no seu tronco
     * @returns array com os branches
     */
    getCurrentBranchTips():string[] {
        return this.branchTips;
    }


    getCommitUserName() : string {
        if ( this.commitLog.length === 5) {
            return this.commitLog[0];
        }
        return '';
    }

    getCommitUserMail() : string {
        if ( this.commitLog.length === 5) {
            return this.commitLog[1];
        }
        return '';
    }

    getCommitData(): string {
        if ( this.commitLog.length === 5) {
            return this.commitLog[2];
        }
        return '';
    }

    getCommitHour(): string {
        if ( this.commitLog.length === 5) {
            return this.commitLog[3];
        }
        return '';
    }

    /**
     * Retorna o texto do commit
     * @returns string com o texto do commit
     */
    getCommitComment(): string {
        if ( this.commitLog.length === 5) {
            return this.commitLog[4];
        }
        return '';
    }

}