import path from 'path';
import * as PubSub from 'pubsub-js';
import { SettingsType, PathMapping, LogOpt, Params2Interpolate } from './types';

export function evaluatePath(settings: SettingsType, curPath?: string): string | undefined {
    // 1) interpola macros e normaliza o caminho de entrada
    const originalRaw = curPath ? macroInterpolation(curPath, settings) : settings.workdir;
    const original = path.normalize(originalRaw);

    // helper: conta quantos níveis (pastas) um path tem
    const countSegments = (p: string) => p.split(/[\\/]/).filter(Boolean).length;

    // 2) converte o dicionário em array e interpola+normaliza
    const mappings = Object.entries(settings.pathMapping)
        .map(([from, to]) => ({
            from: path.normalize(macroInterpolation(from, settings)),
            to: path.normalize(macroInterpolation(to, settings)),
        }))
        // 3) ordena pelo número de segmentos em 'from' (mais profundo primeiro)
        .sort((a, b) => countSegments(b.from) - countSegments(a.from));

    let finalPath: string | undefined;

    // 4) busca o primeiro mapping cujo 'from' é prefixo de original
    for (const { from, to } of mappings) {
        const rel = path.relative(from, original);
        if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) {
            finalPath = path.normalize(path.join(to, rel));
            break;
        }
    }

    if (!finalPath) {
        return undefined;
    }

    // 5) uniformiza barras para '/'
    return finalPath.replaceAll('\\', '/');
}

/**
 * Interpola macros do tipo {projectDir}, {user}, etc.
 * (anexei aqui com os breaks corretos para evitar fallthrough)
 */
export function macroInterpolation(input: string, params: SettingsType): string {
    let out = input;
    const tokens = out.match(/\{\w+\}/g);
    if (tokens) {
        for (const token of tokens) {
            switch (token) {
                case '{projectDir}':
                    out = out.replace(token, params.workdir);
                    break;
                case '{user}':
                    out = out.replace(token, params.user);
                    break;
                case '{project}': {
                    const projectName = path.parse(params.workdir).name;
                    out = out.replace(token, projectName);
                    break;
                }
                case '{solver}':
                    out = out.replace(token, params.solverName);
                    break;
                case '{version}':
                    out = out.replace(token, params.solverVersion);
                    break;
                case '{account}':
                    out = out.replace(token, params.account);
                    break;
                case '{modelDir}':
                    out = out.replace(token, params.destination);
                    break;
                case '{date}': {
                    const iso = new Date().toISOString().slice(0, 19).replace('T', '-');
                    out = out.replace(token, iso);
                    break;
                }
                default:
                    // se aparecer outra macro, deixamos ela lá ou jogamos erro
                    break;
            }
        }
    }
    return out;
}

// import { baseSettings } from '../src/test/suite/baseSettings';
// console.log(evaluatePath(baseSettings, 'L:\\res\\outros\\simuls\\'));
