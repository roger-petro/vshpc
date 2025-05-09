import * as path from 'path';
import { runTests } from '@vscode/test-electron';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

async function main() {
    try {
        const projectRoot = path.resolve(__dirname, '../../');
        // 1) instala/vai no VS Code compilado
        const extensionDevelopmentPath = projectRoot;
        // 2) aponta o projeto de testes
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        const simFolder = process.env.TEST_SIM_FOLDER || '';
        if (!simFolder) {
            console.error('❌ TEST_SIM_FOLDER não definido — configure seu .env.test');
            process.exit(1);
        }
        await runTests({
            version: '1.98.2',
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                simFolder,
                '--disable-gpu',
                '--disable-crash-reporter',
                '--disable-telemetry',
                '--disable-updates',
                '--skip-release-notes',
                '--skip-welcome',
                '--wait',
            ],

            extensionTestsEnv: {
                NODE_OPTIONS: '',
            },
        });

        // console.log('Test runner encerrado — pressione Enter para sair');
        // process.stdin.setRawMode!(true);
        // process.stdin.resume();
        // process.stdin.once('data', () => process.exit(0));
    } catch (err) {
        console.error('Erro lançando testes', err);
        process.exit(1);
    }
}

main();
