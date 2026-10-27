import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

console.log(`Node binary: ${process.execPath}`);
console.log(
  `TypeScript SDK: ${dirname(fileURLToPath(import.meta.resolve('typescript')))}`
);
