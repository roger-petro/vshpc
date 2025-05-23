// tenta abrir o arquivo de log da simulação
// com base nas informações work_dir e modelo

import { window, Uri } from 'vscode';
import { LogOpt } from '../types';
import { getBasicSettings, getSettings } from '../settings';
import { macroInterpolation } from '../path';

type PayLoad = {
    jobid: string;
    name: string;
    chdir: string;
    qos: string;
};

/**
 * Faz o oposto do evaluatePath
 * Pegando o caminho windows dado um caminho linux
 * Retorna um path no formato "Uri.path" (barras como /l:/path/dir no windows)

 */
export function evaluatePathReverse(path: string) {
    let rev = '';
    let settings = getBasicSettings();

    let reverseMapping = {};

    if (process.platform === 'win32') {
        console.log('       >', 'Mapeamento será feito para Windows');
        reverseMapping = settings.customConfig.settings.defaultUnixWindows;
    }
    if (process.platform === 'linux') {
        console.log('       >', 'Mapeamento será feito para Linux');
        if ('defaultUnixReverseMapping' in settings.customConfig.settings) {
            reverseMapping = settings.customConfig.settings.defaultUnixReverseMapping;
            if (Object.keys(reverseMapping).length === 0) {
                console.log('Reverse mapping está vazio para o linux. Problema?');
                rev = path;
            }
        } else {
            console.log('O Reverse mapping para o linux não existe. Carregou a versão customizada correta?');
            rev = path;
        }
    }
    for (const [key, value] of Object.entries(reverseMapping)) {
        if (path.startsWith(macroInterpolation(key, settings)) && typeof value === 'string') {
            console.log(
                '       >',
                'trocando:',
                macroInterpolation(key, settings),
                ' por ',
                macroInterpolation(value, settings),
            );
            rev = path.replace(
                macroInterpolation(key, settings),
                macroInterpolation(value, settings),
            );
            break;
        }
    }

    if (rev.includes('\\\\')) {
        rev = rev.replaceAll('\\\\', '\\');
    }

    rev = rev.replaceAll('\\', '/').replaceAll('//', '/');
    if (!rev.startsWith('/')) {
        rev = '/' + rev;
    }
    console.log('       >', 'antes:', path, ' depois:', rev);
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
    let winUri = await evaluatePathReverse(unixUri);

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
