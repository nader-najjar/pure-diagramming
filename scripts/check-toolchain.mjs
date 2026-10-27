import { readFileSync } from 'node:fs';
const { engines } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (process.versions.node !== engines.node) {
  throw new Error(`Use the repository's Node ${engines.node}, not ${process.versions.node}. See README.md.`);
}
const npmVersion = process.env.npm_config_user_agent?.match(/npm\/([^ ]+)/)?.[1];
if (npmVersion && npmVersion !== engines.npm) {
  throw new Error(`Use npm ${engines.npm}, not ${npmVersion}. See README.md.`);
}
