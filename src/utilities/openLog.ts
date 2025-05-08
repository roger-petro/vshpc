// tenta abrir o arquivo de log da simulação
// com base nas informações work_dir e modelo

import { window, Uri } from 'vscode';
import { LogOpt } from '../types';
import { getSettings } from '../settings';

type PayLoad = {
    jobid: string;
    name: string;
    chdir: string;
    qos: string;
};

/**
 * Faz o oposto do evaluatePath
 * Pegando o caminho windows dado um caminho linux
 * Retorna um path no formato "Uri.path"
 */
export function evaluatePathReverse(path: string) {
    let rev = '';
    let settings = getSettings();
    let unix2Windows = settings.customConfig.settings.defaultUnixWindows;
    for (const [key, value] of Object.entries(unix2Windows)) {
        if (path.startsWith(key)) {
            rev = path.replace(key, value);
            rev = rev.replaceAll('\\\\', '\\');
            break;
        }
    }
    if (!rev.startsWith('/')) {
        rev = '/' + rev;
    }
    rev = rev.replaceAll('\\', '/').replaceAll('//', '/');
    return rev;
}

export async function openLog(payload: PayLoad) {
    let unixUri = '';

    if (payload.name.match(/\.(data|dat)$/i)) {
        unixUri = payload.chdir + '/' + payload.name;
        unixUri = unixUri.replace(/\.dat$/i, '.log').replace(/\.data$/i, '.PRT');
    } else if (payload.qos === 'cmg_brkalman') {
        unixUri = payload.chdir + '/' + payload.name.replace(/_\d+$/, '') + '_1.log';
    } else if (payload.name.match(/\.xml$/i)) {
        unixUri = payload.chdir + '/' + payload.name.replace(/\.xml$/i, '.log');
    } else {
        unixUri = payload.chdir + '/' + payload.name + '.log';
    }
    let winUri = evaluatePathReverse(unixUri);

    try {
        let ret = await window.showTextDocument(Uri.parse(winUri));
        if (ret) {
            return true;
        }
    } catch (error) {
        console.log('Não achou ' + unixUri);
        return false;
    }

    PubSub.publish(LogOpt.bar, 'Função disponível apenas em jobs enviados pelo vshpc');
    return false;
}
