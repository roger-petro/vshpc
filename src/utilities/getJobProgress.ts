import { getSettings } from '../settings';
import { sendSSHcommand } from '../ssh2';
import { SingleJobProgress } from '../types';

export async function getJobProgress(payload: any) {
    const settings = getSettings();
    let script = settings.customConfig.simulators.find(
        e => e.name.toLowerCase() === 'cmg',
    )?.progressScript;
    if ('simulatorName' in payload) {
        script = settings.customConfig.simulators.find(
            e => e.name.toLowerCase() === payload.simulatorName,
        )?.progressScript;
    }
    let cmd = `${script} -j ${payload.jobs} ${payload.sameDate ? '--same' : ''}`;
    console.log(`comando enviado para pegar o progresso: ${cmd}`);
    try {
        let ret = await sendSSHcommand(
            cmd,
            [],
            settings.cluster,
            settings.user,
            settings.passwd,
            settings.privRsaKey,
        );
        if (ret.code === 0) {
            const retmsg: SingleJobProgress[] = JSON.parse(ret.stdout);
            return retmsg;
        } else {
            console.log('Erro de geração do progress. Comando enviado: ', cmd);
            console.log(JSON.stringify(ret));
        }
        return;
    } catch (e) {
        console.log('Catch', e);
        return;
    }
}
