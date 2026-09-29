import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawPath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  '.cursor/projects/c-Users-Pichau-Desktop-a-f/agent-tools/7e941c86-ea54-4cfe-9153-21c97d3400ca.txt',
);

const raw = fs.readFileSync(rawPath, 'utf8');
const j = JSON.parse(raw);
const match = j.result.match(/\[[\s\S]*\]/);
if (!match) throw new Error('no json array in query result');
const rows = JSON.parse(match[0]);

const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
const lines = ['tipo,nome'];
for (const r of rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))) {
  lines.push(`${esc(r.kind === 'child' ? 'crianca' : 'adulto')},${esc(r.name)}`);
}

const out = path.join(__dirname, '..', 'confirmados-export.csv');
fs.writeFileSync(out, `\ufeff${lines.join('\n')}`, 'utf8');
const children = rows.filter((r) => r.kind === 'child').length;
console.log(`Total: ${rows.length}, adultos: ${rows.length - children}, crianças: ${children}`);
console.log(`CSV: ${out}`);
