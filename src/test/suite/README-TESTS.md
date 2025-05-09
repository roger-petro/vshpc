# Para rodar os testes

São necessários dos arquivos de entrada com dados, que não estão comitados por
terem dados privados, e um .env.test na raíz do projeto.

O primeiro é o test-data.nocommit.ts que contém a estrutura abaixo:

```

//contém as entrada e saídas de alguns testes
export const expectedResults = {
   test1: {
       output: '<string esperada na saída>',
   },
   test2: {
       input: '<string com o path de entrada>',
       output: '<string com o path esperado na saida>',
   },
};
export const baseSettings: SettingsType = {
   contem um tipo settings preenchido com valores de teste

}
```

O segundo é o vshpc.json preenchido com dados, conforme template. no
aquivo vshpc.demo.json.

Ambos arquivos devem residir nesta parta e os teste copiará
o vshpc.json para a pasta criada pelo vscode.

O .env.test contem:

TEST_SIM_FOLDER="folder que será aberto com modelo de simulação"
REMOTE_PROJECT_FOLDER="folder remoto que será acessado para rodar a simulação"
PASSWORD=<senha de acesso ssh>
MODEL_NAME=<modelo para rodar uma simulação via test>
