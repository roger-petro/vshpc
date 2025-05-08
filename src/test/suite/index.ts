import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
    // <-- aqui mudamos o ui para 'tdd'
    const mocha = new Mocha({ ui: 'tdd', color: true, bail: false });
    const testsRoot = path.resolve(__dirname);

    const files = await glob('**/*.test.js', { cwd: testsRoot });
    files.forEach(f => mocha.addFile(path.join(testsRoot, f)));

    await new Promise<void>((resolve, reject) => {
        try {
            mocha.run(failures =>
                failures > 0 ? reject(new Error(`${failures} testes falharam.`)) : resolve(),
            );
        } catch (err) {
            reject(err);
        }
    });
}
