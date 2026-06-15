import { existsSync } from 'node:fs';

let loaded = false;

export function loadEnv () {
  if (loaded) return;
  loaded = true;

  if (process.env.NODE_ENV !== 'production' && existsSync('.env')) {
    process.loadEnvFile();
  }
}
