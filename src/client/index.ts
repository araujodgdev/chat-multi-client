import process from 'node:process';
import { startCli } from './ui/cli.js';

const args = process.argv.slice(2);
const nicknameArgIndex = args.findIndex((arg) => arg === '--nickname' || arg === '-n');
const nickname =
  nicknameArgIndex !== -1 && args[nicknameArgIndex + 1] ? args[nicknameArgIndex + 1] : undefined;

await startCli({ nickname });
