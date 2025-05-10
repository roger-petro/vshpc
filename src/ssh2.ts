const { readFileSync } = require('fs');
import { Client, ClientChannel, ConnectConfig } from 'ssh2';

import { SSHMsg, LogOpt } from './types';
import { decrypt } from './crypto';
import * as PubSub from 'pubsub-js';

let announced = false;

export async function sendSSHcommand(
    command: string,
    params: string[],
    cluster: string,
    user: string,
    passwd: string,
    privRsaKey: string,
): Promise<SSHMsg> {
    command += Array.isArray(params) ? ' ' + params.join(' ') : '';

    let key = '';
    if (privRsaKey !== '') {
        try {
            key = readFileSync(privRsaKey);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            key = '';
            PubSub.publish(LogOpt.vshpc, `> ssh2: ${msg}`);
        }
    }

    const sshUserConfig = {
        host: cluster,
        port: 22,
        username: user,
        password: (decrypt(passwd) as string) || '',
    } as ConnectConfig;

    const sshKeyConfig = {
        host: cluster,
        port: 22,
        username: user,
        privateKey: key,
    } as ConnectConfig;

    let ret: any;
    return new Promise(resolve => {
        const con = new Client();
        con.on('ready', () => {
            con.exec(command, (err, stream: ClientChannel) => {
                let buffer = '';
                let bufferError = '';
                if (err) {
                    resolve({
                        code: 128,
                        stderr: err.message,
                        stdout: '',
                        multiline: ('' + err.message).split(/\n|\t/).filter(n => n),
                    });
                }

                stream
                    .on('close', (code: any, signal: any) => {
                        code;
                        signal;
                        con.end();
                        resolve({
                            code: code,
                            stderr: ('' + bufferError).trim(),
                            stdout: ('' + buffer).trim(),
                            multiline: ('' + buffer).split(/\n/).filter(n => n),
                        });
                    })
                    .on('data', (data: string) => {
                        if (data.includes(' files:')) {
                            PubSub.publish(LogOpt.progress, `${data}`);
                        }
                        buffer += data;
                    })
                    .stderr.on('data', (data: string) => {
                        if (data.includes(' files:')) {
                            PubSub.publish(LogOpt.progress, `${data}`);
                        }
                        bufferError += data;
                    });
            });
        }).on('error', err => {
            PubSub.publish(LogOpt.vshpc, `> ssh2: erro no SSH ${err.message}`);
            console.log(err.message);
            resolve({
                code: 128,
                stderr: '',
                stdout: err.message,
                multiline: ('' + err.message).split(/\n|\t/).filter(n => n),
            });
        });

        if (privRsaKey !== '' && key) {
            con.connect(sshKeyConfig);
            if (!announced) {
                PubSub.publish(LogOpt.vshpc, '> ssh2: Conectando pela chave RSA');
                announced = true;
            }
        } else {
            if (sshUserConfig.password && sshUserConfig.password === '') {
                PubSub.publish(
                    LogOpt.vshpc,
                    '> ssh2: Nao é possível conectar sem senha ou erro ao decifrar',
                );
                resolve({
                    code: 128,
                    stderr: '',
                    stdout: 'Falta de senha ou erro em decifrar',
                    multiline: [],
                });
            }
            con.connect(sshUserConfig);
            if (!announced) {
                PubSub.publish(LogOpt.vshpc, '> ssh2: Conectando por senha');
                announced = true;
            }
        }
    });
}
