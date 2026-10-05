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
// Dois formatos de base convivem: o deste repositorio (clients com `id`,
// aportes com `valor`/`observacao`) e o do jarvis-crm (clientes chaveados por
// `nome`, aportes com `total`/`detalhe`/`obs[]`). Cada regra detecta o formato
// pelo proprio registro.
const clientes = conteudo.get(join(DB, 'clients.json'));
if (clientes) {
  const porId = clientes.some((c) => c.id != null);
  const chave = porId ? 'id' : 'nome';
  const ids = new Set(clientes.map((c) => c[chave]));

  const vistos = new Set();
  for (const c of clientes) {
    if (c[chave] == null || c[chave] === '') erros.push(`clients.json: cliente sem "${chave}".`);
    else if (vistos.has(c[chave])) erros.push(`clients.json: ${chave} duplicado "${c[chave]}".`);
    vistos.add(c[chave]);
  }

  for (const [arquivo, dados] of conteudo) {
    if (arquivo.endsWith('clients.json')) continue;
    dados.forEach((reg, i) => {
      if (reg.clienteId && !ids.has(reg.clienteId)) {
        erros.push(`${arquivo}[${i}]: clienteId "${reg.clienteId}" nao existe em clients.json.`);
      }
    });
  }
}

// Cadencia: no maximo 5 clientes com o mesmo proximoContato (regra do Rafael).
if (clientes) {
  const porDia = new Map();
  for (const c of clientes) {
    const d = String(c.proximoContato ?? '').trim().replace(/^0(\d) /, '$1 ');
    if (d) porDia.set(d, (porDia.get(d) ?? 0) + 1);
  }
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const hoje = new Date().toISOString().slice(0, 10);
  const iso = (d) => {
    const m = /^(\d{1,2}) de (\S+) de (\d{4})$/.exec(d);
    const mes = m ? MESES.indexOf(m[2].toLowerCase()) + 1 : 0;
    return mes ? `${m[3]}-${String(mes).padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
  };
  for (const [d, n] of porDia) {
    // So agenda futura: atraso acumulado no passado e backlog, nao agendamento.
    if (n > 5 && iso(d) >= hoje) erros.push(`clients.json: ${n} clientes com proximoContato "${d}" (maximo 5 por dia).`);
  }
}

// Aportes: status e valor ausente.
// contributions.json guarda so aporte efetivado (status "Concluído"). Intencao,
// ordem nao aceita ou cancelada vai para activities.json (Follow-up/historico).
const aportes = conteudo.get(join(DB, 'contributions.json')) ?? [];
const OBS = 'Valor financeiro não informado pelo Rafael.';
// Regra do valor em branco vale a partir da configuracao do repositorio
// (28/07/2026). Registros anteriores vieram do Notion sem esse campo: so aviso.
const INICIO_REGRA = '2026-07-28';
const isoData = (s) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s ?? '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : (/^\d{4}-\d{2}-\d{2}/.test(s ?? '') ? s.slice(0, 10) : '');
};
const temValor = (a) => {
  if ('valor' in a) return !(a.valor === '' || a.valor == null);
  if (String(a.total ?? '').trim()) return true;
  if ((a.detalhe ?? []).some((d) => String(d.valor ?? '').trim())) return true;
  return /(R\$|US\$|U\$)\s?\d|\b\d+\s?(k|mil)\b/i.test(a.titulo ?? '');
};
const temObs = (a) =>
  a.observacao === OBS || (Array.isArray(a.obs) ? a.obs : [a.obs]).some((o) => String(o ?? '').includes(OBS));
let legadoSemValor = 0;
aportes.forEach((a, i) => {
  const quem = a.cliente ?? a.clienteId;
  if (a.status !== 'Concluído') {
    erros.push(
      `contributions.json[${i}] (${quem}): status "${a.status}" invalido. ` +
        'Aporte efetivado entra como "Concluído"; o resto e Follow-up em activities.json.',
    );
  }
  if (!temValor(a) && !temObs(a)) {
    const d = isoData(a.data);
    if (d && d < INICIO_REGRA) legadoSemValor++;
    else erros.push(`contributions.json[${i}] (${quem}): valor em branco exige observacao "${OBS}".`);
  }
});
if (legadoSemValor) {
  avisos.push(`contributions.json: ${legadoSemValor} aporte(s) anteriores a 28/07/2026 sem valor (legado do Notion).`);
}

// Follow-ups (AGENTS.md §4g do jarvis-crm): prazo valido, acao e origem
// preenchidas; fechado exige data de conclusao.
const atividades = conteudo.get(join(DB, 'activities.json')) ?? [];
const ACOES = ['Conferir execução', 'Reenviar ordem', 'Aceitar no BTG', 'Enviar ao cliente', 'Responder cliente', 'Identificar'];
const ORIGENS = ['Aporte', 'WhatsApp', 'Reunião', 'Rafael'];
atividades.forEach((a, i) => {
  if (!/^follow-?up$/i.test(String(a.tipo ?? '').trim())) return;
  const quem = `activities.json[${i}] (${a.cliente || '?'})`;
  if (!isoData(a.prazo)) erros.push(`${quem}: follow-up sem prazo DD/MM/AAAA.`);
  if (!ACOES.includes(a.acao)) erros.push(`${quem}: follow-up com acao "${a.acao ?? ''}" fora da lista (${ACOES.join(' | ')}).`);
  if (!ORIGENS.includes(a.origem)) erros.push(`${quem}: follow-up com origem "${a.origem ?? ''}" fora da lista (${ORIGENS.join(' | ')}).`);
  if (a.status === 'Concluído' && !isoData(a.conclusao)) erros.push(`${quem}: follow-up concluido sem data em "conclusao".`);
  if (!a.cliente) avisos.push(`${quem}: follow-up sem cliente (nao aparece na ficha).`);
});

// Tipo de campo: alguns campos precisam ser sempre string (nunca array/objeto),
// senao quebram o dashboard.html (ex.: clean() faz (s||"").replace(...), que
// lanca TypeError se `s` for array/objeto, travando o clique na ficha do
// cliente sem nenhum erro visivel na tela). Caso real: meetings.json.resumo
// gravado como ["texto"] em vez de "texto" (25/08/2026), corrigido em
// 28/08/2026 apos travar a ficha de 3 clientes.
const CAMPOS_STRING = {
  'meetings.json': ['resumo', 'titulo', 'categoria', 'proxima'],
  'clients.json': ['pendencia', 'resumo', 'obs', 'alertas', 'patAcomp'],
  'activities.json': ['proximoPasso', 'descricao', 'valor'],
  'contributions.json': ['titulo', 'total'],
};
for (const [nomeArquivo, campos] of Object.entries(CAMPOS_STRING)) {
  const dados = conteudo.get(join(DB, nomeArquivo));
  if (!dados) continue;
  dados.forEach((reg, i) => {
    for (const campo of campos) {
      const v = reg[campo];
      if (v != null && typeof v !== 'string') {
        erros.push(
          `${nomeArquivo}[${i}] (${reg.cliente ?? reg.nome ?? '?'}): campo "${campo}" ` +
            `deveria ser string, veio ${Array.isArray(v) ? 'array' : typeof v}. ` +
            'Isso trava o clique na ficha do cliente no painel.',
        );
      }
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
