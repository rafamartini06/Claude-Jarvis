#!/usr/bin/env node
// Valida a base em Dashboard/db/: sintaxe JSON, formato "um objeto por linha",
// UTF-8 sem mojibake, e integridade referencial clienteId -> clients.json.
// Sai com codigo 1 se qualquer arquivo falhar.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DB = 'Dashboard/db';
const BASE = ['clients', 'contributions', 'activities', 'meetings', 'memories', 'financeiro'];

const erros = [];
const avisos = [];

function alvos() {
  const lista = [];
  for (const n of BASE) {
    const caminho = join(DB, `${n}.json`);
    if (existsSync(caminho)) lista.push(caminho);
    else erros.push(`${caminho}: arquivo obrigatorio ausente.`);
  }
  const dirSaldos = join(DB, 'saldos');
  if (existsSync(dirSaldos)) {
    for (const f of readdirSync(dirSaldos).filter((f) => f.endsWith('.json')).sort()) {
      lista.push(join(dirSaldos, f));
    }
  }
  return lista;
}

function valida(arquivo) {
  const bruto = readFileSync(arquivo);
  const texto = bruto.toString('utf8');

  // Mojibake: bytes UTF-8 lidos como Latin-1 em algum ponto do caminho.
  if (/Ã[-¿]|Â[-¿]/.test(texto)) {
    erros.push(`${arquivo}: acentuacao corrompida (mojibake). Reverter e reescrever em UTF-8.`);
    return null;
  }
  if (texto.charCodeAt(0) === 0xfeff) {
    erros.push(`${arquivo}: BOM UTF-8 presente. Gravar sem BOM.`);
    return null;
  }
  if (texto.includes('\r\n')) {
    erros.push(`${arquivo}: quebras de linha CRLF. Usar LF.`);
    return null;
  }

  let dados;
  try {
    dados = JSON.parse(texto);
  } catch (e) {
    erros.push(`${arquivo}: JSON invalido -> ${e.message}`);
    return null;
  }

  if (!Array.isArray(dados)) {
    erros.push(`${arquivo}: raiz precisa ser uma lista.`);
    return null;
  }

  // Formato: um objeto por linha.
  const linhas = texto.replace(/\n$/, '').split('\n');
  if (linhas[0] !== '[' || linhas[linhas.length - 1] !== ']') {
    avisos.push(`${arquivo}: deve abrir com "[" e fechar com "]" em linhas proprias.`);
  }
  const corpo = linhas.slice(1, -1);
  if (corpo.length !== dados.length) {
    avisos.push(
      `${arquivo}: ${dados.length} objeto(s) em ${corpo.length} linha(s). ` +
        'Formato esperado: um objeto por linha.',
    );
  }
  corpo.forEach((linha, i) => {
    if (!/^\{.*\}(,)?$/.test(linha.trim())) {
      avisos.push(`${arquivo}:${i + 2}: linha nao contem exatamente um objeto.`);
    }
  });

  return dados;
}

const conteudo = new Map();
for (const arquivo of alvos()) {
  const dados = valida(arquivo);
  if (dados) conteudo.set(arquivo, dados);
}

// Integridade referencial.
const clientes = conteudo.get(join(DB, 'clients.json'));
if (clientes) {
  const ids = new Set(clientes.map((c) => c.id));

  const vistos = new Set();
  for (const c of clientes) {
    if (vistos.has(c.id)) erros.push(`clients.json: id duplicado "${c.id}".`);
    vistos.add(c.id);
  }

  for (const [arquivo, dados] of conteudo) {
    if (arquivo.endsWith('clients.json')) continue;
    dados.forEach((reg, i) => {
      if (reg.clienteId && !ids.has(reg.clienteId)) {
        erros.push(`${arquivo}[${i}]: clienteId "${reg.clienteId}" nao existe em clients.json.`);
      }
    });
  }

  // Aportes: status e valor ausente.
  const aportes = conteudo.get(join(DB, 'contributions.json')) ?? [];
  const OBS = 'Valor financeiro não informado pelo Rafael.';
  aportes.forEach((a, i) => {
    if (a.status !== 'Concluído') {
      erros.push(
        `contributions.json[${i}] (${a.cliente ?? a.clienteId}): status "${a.status}" ` +
          'invalido. Todo aporte efetivado entra como "Concluido".',
      );
    }
    if ((a.valor === '' || a.valor == null) && a.observacao !== OBS) {
      erros.push(
        `contributions.json[${i}] (${a.cliente ?? a.clienteId}): valor em branco exige ` +
          `observacao "${OBS}".`,
      );
    }
  });
}

for (const a of avisos) console.warn(`AVISO  ${a}`);
for (const e of erros) console.error(`ERRO   ${e}`);

if (erros.length) {
  console.error(`\n${erros.length} erro(s). Base NAO esta pronta para publicar.`);
  process.exit(1);
}
console.log(`OK - ${conteudo.size} arquivo(s) validado(s)${avisos.length ? `, ${avisos.length} aviso(s)` : ''}.`);
