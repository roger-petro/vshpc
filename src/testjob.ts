import * as vscode from 'vscode';

import { checkAccountSettings, getSettings } from './settings';
import { LogOpt } from './types';
import { sprintf } from 'sprintf-js';
import { scpWrite } from './scp2';
import { sendSSHcommand } from './ssh2';
import { dismiss } from './dismissable';

let jobMock = vscode.commands.registerCommand('vshpc.jobMock', async function() {
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
                vscode.commands.executeCommand('vshpc.jobsMgmt');
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


export function setJobTestCmd(context: vscode.ExtensionContext){
    context.subscriptions.push(jobMock);
}