#!/usr/bin/env node
// Gera Dashboard/dados.js a partir de Dashboard/db/*.json.
//
// ATENCAO: dados.js e ARTEFATO GERADO. Nao editar a mao.
// Em producao quem roda este script e a GitHub Action (.github/workflows/publish.yml).
// Rodar local apenas para diagnostico.

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DB = 'Dashboard/db';
const SAIDA = 'Dashboard/dados.js';

const BASE = {
  clientes: 'clients.json',
  aportes: 'contributions.json',
  atividades: 'activities.json',
  reunioes: 'meetings.json',
  memorias: 'memories.json',
  financeiro: 'financeiro.json',
};

function ler(arquivo) {
  const caminho = join(DB, arquivo);
  if (!existsSync(caminho)) return [];
  return JSON.parse(readFileSync(caminho, 'utf8'));
}

const dados = {};
for (const [chave, arquivo] of Object.entries(BASE)) {
  dados[chave] = ler(arquivo);
}

// Snapshots historicos de saldo, indexados por data.
dados.saldos = {};
const dirSaldos = join(DB, 'saldos');
if (existsSync(dirSaldos)) {
  for (const f of readdirSync(dirSaldos).filter((f) => f.endsWith('.json')).sort()) {
    dados.saldos[f.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(dirSaldos, f), 'utf8'));
  }
}

dados.geradoEm = new Date().toISOString();

const js = `// ARQUIVO GERADO AUTOMATICAMENTE - NAO EDITAR.
// Fonte: Dashboard/db/*.json  |  Gerador: scripts/build-dados.mjs
// Toda alteracao manual sera sobrescrita pela GitHub Action.

window.DADOS = ${JSON.stringify(dados, null, 2)};
`;

writeFileSync(SAIDA, js, { encoding: 'utf8' });

const total = Object.entries(BASE)
  .map(([k]) => `${k}=${dados[k].length}`)
  .join(' ');
console.log(`${SAIDA} gerado. ${total} snapshots=${Object.keys(dados.saldos).length}`);
