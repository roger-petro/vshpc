import { readFileSync } from 'fs';
import { LogOpt } from './types';
import { decrypt } from './crypto';
import * as PubSub from 'pubsub-js';
import { WithImplicitCoercion } from 'buffer';

export async function scpRead(
    content: string,
    cluster: string,
    user: string,
    passwd: string,
    privRsaKey: string,
) {
    let Client = require('ssh2-sftp-client');
    let key = Buffer.from('');
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
        privateKey: Buffer.from(''),
        password: '',
    };

    if (key) {
        sshConfig.privateKey = key;
    } else {
        sshConfig.password = decrypt(passwd) || '';
    }

    return new Promise(resolve => {
        const client = new Client();
        client
            .connect(sshConfig)
            .then(() => {
                return client.get(content, undefined);
            })
            .then((buffer: WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>) => {
                client.end();
                //console.log(Buffer.from(buffer).toString('base64'));
                resolve(Buffer.from(buffer).toString('base64'));
            })
            .catch((err: { message: any }) => {
                console.log(err.message);
                resolve('');
            });
    });
}
