import { readdirSync, readFileSync } from 'node:fs';
import { parseDiagram } from '../src/model.ts';
const directory = new URL('../diagrams/', import.meta.url);
const files = readdirSync(directory).filter((file) => file.endsWith('.json'));
if (!files.length) throw new Error('Add at least one diagram in diagrams/.');
for (const file of files) {
  parseDiagram(readFileSync(new URL(file, directory), 'utf8'));
  console.log(`Valid: diagrams/${file}`);
}
