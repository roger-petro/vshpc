# vsHPC README

## General User Information

This extension aims to help engineers launch jobs in HPC environments that use SLURM as a scheduler. The simulators to be used must be dynamically pre-loaded via a configuration file to avoid exposing private information. The configuration file can be loaded via the command palette or through the walkthrough.

An example of a configuration file is in the file vshpc.demo.json (available on github). Some information in this file must be changed according to your case. The simulators used are from the Reservoir area, but with some adjustments, other simulation engines can be employed. The file contains a series of tags to be replaced by the sprintf function before sending to the cluster. Check the submit.ts (github) source file to better understand the tags.

## Extension Usage

### Configuração básica

Você deve configurar o acesso SSH ao cluster. Um valor de hostname pode ter sido já carregado via arquivo de configuração fornecido pelo seu administrador.
Todavia, esta configuração pode ser alterada a qualquer tempo via settings do VSCODE, filtrando pelo nome da extensão.
