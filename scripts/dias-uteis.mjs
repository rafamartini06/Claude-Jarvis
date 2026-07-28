#!/usr/bin/env node
// Soma dias uteis a uma data, pulando fim de semana e feriados nacionais.
//
//   node scripts/dias-uteis.mjs 2026-07-27 7
//   node scripts/dias-uteis.mjs 2026-07-27 N2
//
// Cadencia: N1 = 7, N2 = 15, N3 = 30 dias uteis.

const CADENCIA = { N1: 7, N2: 15, N3: 30 };

// Feriados nacionais fixos (MM-DD).
const FIXOS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];

// Pascoa pelo algoritmo de Meeus/Jones/Butcher (calendario gregoriano).
function pascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(ano, mes - 1, dia);
}

const DIA = 86400000;

function feriados(ano) {
  const set = new Set(FIXOS.map((md) => `${ano}-${md}`));
  const p = pascoa(ano);
  // Moveis relativos a Pascoa.
  for (const [offset] of [[-48], [-47], [-2], [60]].map((x) => x)) {
    set.add(new Date(p + offset * DIA).toISOString().slice(0, 10));
  }
  return set;
}

const cacheFeriados = new Map();
function ehFeriado(d) {
  const ano = d.getUTCFullYear();
  if (!cacheFeriados.has(ano)) cacheFeriados.set(ano, feriados(ano));
  return cacheFeriados.get(ano).has(d.toISOString().slice(0, 10));
}

function ehDiaUtil(d) {
  const dow = d.getUTCDay();
  return dow !== 0 && dow !== 6 && !ehFeriado(d);
}

export function somarDiasUteis(iso, n) {
  let d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`data invalida: ${iso}`);
  let restam = n;
  while (restam > 0) {
    d = new Date(d.getTime() + DIA);
    if (ehDiaUtil(d)) restam--;
  }
  // Se n = 0, ainda assim garante dia util.
  while (!ehDiaUtil(d)) d = new Date(d.getTime() + DIA);
  return d.toISOString().slice(0, 10);
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function porExtenso(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [data, arg] = process.argv.slice(2);
  if (!data || !arg) {
    console.error('uso: node scripts/dias-uteis.mjs <YYYY-MM-DD> <n|N1|N2|N3>');
    process.exit(2);
  }
  const n = CADENCIA[arg.toUpperCase()] ?? Number(arg);
  if (!Number.isFinite(n)) {
    console.error(`quantidade invalida: ${arg}`);
    process.exit(2);
  }
  const res = somarDiasUteis(data, n);
  console.log(`${res}  ->  ${porExtenso(res)}`);
}
