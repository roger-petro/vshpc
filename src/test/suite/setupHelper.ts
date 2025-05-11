// test/suite/setupHelper.ts

/**
 * Sem uso ainda mas é para tentar colocar o código
 * do setup em um lugar comum
 */
import path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import { encrypt } from '../../crypto';
import { loadSettings } from '../../settings';
import {
  linuxTests, winTests,
  baseLinuxSettings, baseWindowsSettings
} from './test-data.nocommit';
import type { SettingsType } from '../../types';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

export async function commonSuiteSetup(this: Mocha.Context) {
  this.timeout(100_000);

  // escolhe mocks de acordo com a plataforma
  const tests  = process.platform === 'linux' ? linuxTests : winTests;
  const base   = process.platform === 'linux'
    ? baseLinuxSettings
    : baseWindowsSettings;

  // ativa a extensão
  const ext = vscode.extensions.getExtension('rogerio-cunha.vshpc');
  if (!ext) {throw new Error('Extensão não encontrada.');}
  await ext.activate();

  // copia o config para o storage
  const ctx     = ext.exports.getExtensionContext();
  const src     = path.join(ctx.extensionUri.fsPath, 'src','test','suite','vshpc.json');
  const destUri = vscode.Uri.joinPath(ctx.globalStorageUri, 'vshpc.json');
  const buf     = await fs.readFile(src);
  await vscode.workspace.fs.writeFile(destUri, buf);

  // carrega e ajusta settings
  const settings: SettingsType = await loadSettings(ctx);
  settings.user      = base.user;
  settings.cluster   = base.cluster;
  settings.privRsaKey= base.privRsaKey;
  settings.passwd    = encrypt(process.env.PASSWORD || '');
  settings.account   = base.account;

  // expõe tudo via this para o suite
  Object.assign(this, { ctx, tests, settings });
}