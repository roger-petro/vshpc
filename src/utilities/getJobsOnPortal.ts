import { getBasicSettings, getSettings } from '../settings';
import { sendSSHcommand } from '../ssh2';
import { SingleJobProgress } from '../types';

export async function getJobsOnPortal(payload: any) {
    const settings = getBasicSettings();
    let baseScriptDir = settings.customConfig.settings?.remoteBaseScriptDir;

    if (!baseScriptDir) {
        return null;
    }
    let cmd = `${baseScriptDir}/cli-api/mongo/findAll.py -j ${payload.jobs}`;
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
            const retmsg: string[] = JSON.parse(ret.stdout);
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
