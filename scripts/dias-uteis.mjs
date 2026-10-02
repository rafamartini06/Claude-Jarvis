#!/usr/bin/env node
// Soma dias corridos a uma data (cadencia de contato). Unica excecao: se o
// resultado cair em fim de semana, empurra para o proximo dia util (segunda).
//
//   node scripts/dias-uteis.mjs 2026-07-27 7
//   node scripts/dias-uteis.mjs 2026-07-27 N2
//
// Cadencia: N1 = 15, N2 = 15, N3 = 30 dias corridos.

const CADENCIA = { N1: 15, N2: 15, N3: 30 };

const DIA = 86400000;

function ehFimDeSemana(d) {
  const dow = d.getUTCDay();
  return dow === 0 || dow === 6;
}

export function somarDiasUteis(iso, n) {
  let d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`data invalida: ${iso}`);
  d = new Date(d.getTime() + n * DIA);
  while (ehFimDeSemana(d)) d = new Date(d.getTime() + DIA);
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
