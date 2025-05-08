import * as crypto from 'crypto';
const algorithm = 'aes-256-cbc';
import * as PubSub from 'pubsub-js';
import { getSettings } from './settings';
import { LogOpt } from './types';

function evalKey() {
    let specHash: string | null = null;
    const VSHPC = getSettings().customConfig;
    if (VSHPC && VSHPC.settings.specHash) {
        specHash = VSHPC.settings.specHash;
    }
    let keystr = 'sRfsmrWW';
    if (specHash) {
        keystr = process.env.USERNAME + specHash;
    } else {
        keystr = process.env.USERNAME + keystr;
    }
    return crypto.createHash('sha256').update(String(keystr)).digest('base64').substr(0, 32);
}

export function encrypt(text: string): string {
    let iv = crypto.randomBytes(16);
    let cipher = crypto.createCipheriv(algorithm, Buffer.from(evalKey()), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(text: string): string | null {
    try {
        if (text.length === 0) {
            return null;
        }

        if (text.includes(':')) {
            try {
                let cifredIV = text.split(':')[0];
                let cifredText = text.split(':')[1];
                let iv = Buffer.from(cifredIV, 'hex');
                let encryptedText = Buffer.from(cifredText, 'hex');
                let decipher = crypto.createDecipheriv(algorithm, Buffer.from(evalKey()), iv);
                let decrypted = decipher.update(encryptedText);
                decrypted = Buffer.concat([decrypted, decipher.final()]);
                return decrypted.toString();
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                PubSub.publish(LogOpt.vshpc, `> decrypt: erro: ${msg}`);
                return msg;
            }
        } else {
            PubSub.publish(LogOpt.vshpc, '> decrypt: Dado encriptado fora do padrão');
            return null;
        }
    } catch (e) {
        //console.log(e.message);
        return null;
    }
}

if (typeof require !== 'undefined' && require.main === module) {
}
