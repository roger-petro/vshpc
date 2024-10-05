export const clocks = ['\u{1F550}','\u{1F551}','\u{1F552}','\u{1F553}',
'\u{1F554}','\u{1F555}','\u{1F556}','\u{1F557}',
'\u{1F558}','\u{1F559}','\u{1F55A}','\u{1F55B}'];


export interface Info  {
    wvUri : any,
    fsPath: string,
    modelName: string;
    workspace: string;
    relative: string;
    alias: string;
};

/* eslint-disable curly */
export function foldersBetween(start:string,stop:string, sep='\\') {
    let paths: string[] = [];
    if (start[start.length-1]===sep)
        start = start.slice(0,-1);
    if (stop[stop.length-1]===sep)
        stop = stop.slice(0,-1);
    if (start.split(sep).length === stop.split(sep).length){
        //console.log('tamanho igual');
        return [stop];
    }

    if (start.split(sep).length < stop.split(sep).length){
        let temp = start;
        start = stop;
        stop = temp;
    }
    for (let idx = stop.split(sep).length; idx <= start.split(sep).length; idx++) {
        paths.push(start.split(sep).slice(0,idx).join(sep));
    }
    return paths;
}

/**
 * Retorna os paths URI enxergadas pelo vscode-webview (fqdn) entre o caminho relativo
 * e a raiz do multiroot
 * @param wvUri fqdn da URI com o arquivo no final
 * @param relative caminho relativo do arquivo dado pelo multiroot do vscode
 * @returns array com os caminhos intermediários até a ponta
 */
export function urisAlong(wvUri,relative) {
    let longerUri = wvUri.replace(/\/[^/]+?\.\w+$/, "/");
    let relativeUri = relative.replace(/\/[^/]+?\.\w+$/, "/");

    let paths = [];

    for (let idx = 0; idx < relativeUri.split('/').length; idx++) {
        if (longerUri.split('/').slice(0,-idx).join('/').length === 0)
            continue;
        paths.unshift(longerUri.split('/').slice(0,-idx).join('/'));
    }
    return paths;
}

export const helpContentMulti = `
<p>
1 - Inclua/remova os Modelos:
clicando com o botão
direito sobre o ".dat", no explorer do vscode,
e escolhendo no menu de contexto (botão direito sobre o arquivo)
"Acionar ao quadro comparativo".
Pode-se também remover o modelo, clicando em "-",
na tela do "Dashboard"
</p><p>
2 - Adicione o "rótulo"
para o nome do modelo que seja
significativo e que vai aparecer
no gráfico. O rótulo está ao
lado ou abaixo do nome, na lista
de modelos.
</p><p>
3 - Selecione o tipo
de gráfico no menu dropdown
ao lado do "(Re)gerar Gráfico"
</p><p>
4 – Selecione apenas uma origem,
A que será comparada.
Use a lista "Origens"
</p><p>
5 - Selecione a
posição da legenda
no gráfico (Pos. legenda)
e o número de colunas
</p><p>
6 - Solicite (Re)gerar
o Gráfico
</p><p>
7 - Aguarde que o gráfico
será apresentado.
Mesmo fechando a janela,
no futuro, se o gráfico for
gerado, ele será apresentado
</p><p>
8 - Opcional:
Na mesma pasta do projeto
é gerado um “html” que
pode ser copiado para onde
desejar. Ele é autocontido.
</p><p>
Dois atalhos do VSCODE
podem ajudar: F11 para fullscreen
e CONTROL+B para esconder a barra
lateral.
</p>
`;


export const helpContentSingle = `
<p>
<strong>Passos:</strong>
</p><p>
1 - Selecione o "Painel" no alto
</p><p>
2 - (Opcional) Selecionar os elementos
no painel à esquerda. A caixa inferior
permite selecionar todos os filhos
do grupo escolhido.
</p><p>
3 - Selecione o número de colunas
e o a posição da legenda nos gráficos.
A resolução é automática.
</p><p>
4 - Clique em "Gerar Painel"
</p><p>
<strong>Observações:</strong>
</p><p>
* Não é necessário manter
o vscode aberto enquanto
o painel é gerado.
</p><p>
* Na mesma pasta do projeto
é gerado um arquivo “.html”
com o painel. Este arquivo pode
ser copiado para outra pasta.
Todas as informações dos
gráficos estão dentro
deste arquivo.
</p><p>
* É possível alterar a altura
dos gráficos de forma dinâmica.
</p><p>
* Para visualizar em um tela maior,
é possível abrir o arquivo ".html"
diretamente no browser.
</p><p>
<strong>Atalhos úteis do VsCode</strong>:
</p><p>
- F11: para ver em tela cheia (fullscreen) ou retornar à visão normal
</p><p>
- Ctrl+B: para esconder/mostrar a barra do Explorer.
</p>
`;