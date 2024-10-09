import path from 'path';
import * as PubSub from 'pubsub-js';
import {SettingsType, WindowUnixMap, LogOpt, Params2Interpolate} from './types';

/** Transforma um path de origin em um destino
 *  sem realizar interpolações, usando settings.unixWindows
 * @param settings
 * @returns string|null
 */
export function evaluatePath(settings: SettingsType, curPath:string|null = null): string|null {

    //curPath pode agora conter interpolações, caso ele seja passado para a função
    curPath = curPath? macroInterpolation(curPath,settings): settings.workdir;

    let windowsUnix: WindowUnixMap = {};
    Object.assign(windowsUnix,settings.windowsUnix);

    const interpolatedObject : { [key: string]: string; } = {};
    //faz o parse a procura de placeholders
    for ( const key in windowsUnix) {
        interpolatedObject[macroInterpolation(key, settings)] = macroInterpolation(windowsUnix[key], settings);
    };

    for (let key in interpolatedObject) {
        if (key.match(/\{|\}/) || interpolatedObject[key].match(/\{|\}/)) {
            PubSub.publish(LogOpt.vshpc, `> evaluatePath: O "de-para" ${key}, ${interpolatedObject[key]} não pode ser transladado`);
            return null;
        }
    }

    let sourcePaths = Object.keys(interpolatedObject);
    //ordena o array pela string mais longa
    sourcePaths = sourcePaths.sort(function(a, b){
        return b.split(/\\|\//).filter(e=>e).length - a.split(/\\|\//).filter(e=>e).length;
    });


    let chosen:number= -1; //vai receber o index do caminho que der match no "de"

    const curPathArr = curPath.split(/\\|\//).filter(e => e);


    //console.log('CurPath em ' + JSON.stringify(curPathArr));
    for (let key = 0;  key < sourcePaths.length; key++) {

        const matchArray = sourcePaths[key].split(/\\|\//).filter(e => e);

        if ( matchArray.length > curPathArr.length ) {
            //console.log('> O comprimento de ' + JSON.stringify(matchArray) + 
            //' era maior que ' + JSON.stringify(curPathArr) + '. Ignorando');
            continue;
        }

        //console.log('> Procurando em ' + JSON.stringify(matchArray));

        for (let index in matchArray) {
            let folderLevel = matchArray[index];
            if (curPathArr[index].toUpperCase() !== folderLevel.toUpperCase()) {
                //console.log(' >> Não deu match em ' + folderLevel);
                chosen = -1;
                break;
            } else {
                //console.log(' >> Deu match em ' + folderLevel);
                chosen = key;
            }
        }

        if (chosen !== -1 ) { //para no mais longo
            break;
        }
    }

    if (chosen > -1) {
        //console.log('Foi escolhido o caminho de origem ' + sourcePaths[chosen] + ' para substituir pelo workdir');
        if (curPath[0] === '\\' ) {curPath = curPath.substring(1);} //o usuário não colocou barra no final do caminho Windows
        curPath = curPath.substring(sourcePaths[chosen].length); //retira os caracteres coincidentes
        let dir = `${interpolatedObject[sourcePaths[chosen]]}/${curPath.replace(/\\/g,'/')}`;
        dir = dir.replace(/\/\//g, '/');  //.toLowerCase();
        //PubSub.publish(LogOpt.vshpc, `> evaluatePath: caminho "para": ${dir} `);
        return dir;
    }
    PubSub.publish(LogOpt.vshpc, `> evaluatePath: Não houve um "de-para" adequado para o caminho ${curPath}`);
    return null;
    //throw new UserException('Erro ao determinar o "de-para" entre Windows e Unix');
};

/** Interpola com um objeto contendo as chaves
 * @params path2Interpolate: string
 * @params params: um objeto com as chaves >=  aos nomes interpolados
 * @returns path interpolado ou original se não for possível transformar
 */
export function macroInterpolation(str2interpolate: string, params: SettingsType) : string {

    const parses = str2interpolate.match(/\{\w+\}/g);
    if (parses) {
        parses.forEach(element => {
            switch (element) {
                case '{projectDir}':
                    str2interpolate = str2interpolate.replace('{projectDir}',params.workdir);
                case '{user}' :
                    str2interpolate = str2interpolate.replace('{user}',params.user);
                case '{project}' :
                    const projectName = path.parse(params.workdir).name;
                    str2interpolate = str2interpolate.replace('{project}',projectName);
                case '{solver}' :
                    str2interpolate = str2interpolate.replace('{solver}',params.solverName);
                case '{version}' :
                    str2interpolate = str2interpolate.replace('{version}',params.solverVersion);
                case '{account}' :
                    str2interpolate = str2interpolate.replace('{account}',params.account);
                case '{modelDir}' :
                        str2interpolate = str2interpolate.replace('{modelDir}',params.destination);
                case '{date}' :
                    //"2016-11-21T08:00:00.000Z"
                    let today = new Date().toISOString();
                    today = today.slice(0,19).replace('T','-');
                    str2interpolate = str2interpolate.replace('{date}',today);
            };
        });
    }
    return str2interpolate;

}
