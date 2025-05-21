import { Client, ConnectConfig } from 'ssh2';
import { readFileSync } from 'fs';
import { LogOpt } from './types';
import { decrypt } from './crypto';
import * as PubSub from 'pubsub-js';

export async function scpWrite(
    content: string,
    destination: string,
    cluster: string,
    user: string,
    passwd: string,
    privRsaKey: string,
): Promise<boolean> {
    let key: Buffer = Buffer.from('');
    if (privRsaKey !== '') {
        try {
            key = readFileSync(privRsaKey);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            PubSub.publish(LogOpt.vshpc, `> scp2: ${msg}`);
        }
    }

    const sshConfig = {
        host: cluster,
        port: 22,
        username: user,
    } as ConnectConfig;

    if (privRsaKey !== '' && key) {
        sshConfig.privateKey = key;
    } else {
        sshConfig.password = decrypt(passwd) || '';
    }

    return new Promise((resolve, reject) => {
        const con = new Client();
        con.on('ready', () => {
            PubSub.publish(LogOpt.vshpc, '> scp2: ' + 'Client::ready');
            con.sftp((err, sftp) => {
                if (err) {
                    PubSub.publish(LogOpt.vshpc, '> scp2: ' + err.message);
                    reject(false);
                }
                const stream = sftp.createWriteStream(destination);
                stream.write(content, 'utf8', err => {
                    if (err) {
                        PubSub.publish(LogOpt.vshpc, '> scp2: ' + err.message);
                        reject(false);
                    } else {
                        PubSub.publish(LogOpt.vshpc, '> scp2: ' + 'Enviado');
                        con.end();
                        resolve(true);
                    }
                });
            });
        })
            .on('error', err => {
                PubSub.publish(LogOpt.vshpc, '> scp2: ' + err.message);
                resolve(false);
            })
            .connect(sshConfig);
    });
}

export async function scpRead(
    content: string,
    cluster: string,
    user: string,
    passwd: string,
    privRsaKey: string,
): Promise<string> {
    let key: Buffer = Buffer.from('');
    if (privRsaKey !== '') {
        try {
            key = readFileSync(privRsaKey);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            PubSub.publish(LogOpt.vshpc, `> scp2Read: ${msg}`);
        }
    }

    const sshConfig = {
        host: cluster,
        port: 22,
        username: user,
    } as ConnectConfig;

    if (privRsaKey !== '' && key) {
        sshConfig.privateKey = key;
    } else {
        sshConfig.password = decrypt(passwd) || '';
    }

    return new Promise((resolve, reject) => {
        const con = new Client();
        con.on('ready', () => {
            PubSub.publish(LogOpt.vshpc, '> scp2Read: ' + 'Client::ready');
            con.sftp((err, sftp) => {
                if (err) {
                    PubSub.publish(LogOpt.vshpc, '> scp2Read: ' + err.message);
                    reject('');
                }

                const stream = sftp.createReadStream(content, {});
                stream.setEncoding('utf8');
                let data = '';
                stream.on('readable', () => {
                    let chunck: string = '';
                    while (null !== (chunck = stream.read())) {
                        data += chunck;
                    }
                    resolve(data);
                });
            });
        })
            .on('error', err => {
                PubSub.publish(LogOpt.vshpc, '> scp2Read: ' + err.message);
                resolve('');
            })
            .connect(sshConfig);
    });
}
