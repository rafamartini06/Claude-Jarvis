# JARVIS — CRM Private Banking

Base de dados e automação de publicação do painel de gestão.
Assistente: **JARVIS**. Operador: **Rafael di Martini Jaser**, AUVP Capital.

> **Leia `AGENTS.md` e `CLAUDE.md` por completo antes de qualquer alteração.**
> São a fonte da verdade operacional.

---

## Como funciona

```
Dashboard/db/*.json          ← você edita AQUI, e só aqui
        │
        │  commit + push (master)
        ▼
GitHub Action (publish.yml)  ← valida, regenera dados.js, publica
        │
        ▼
jarvis-painel                ← repositório gerado, NÃO tocar
        │
        ▼
Vercel                       ← republica sozinha
```

Painel no ar: <https://jarvis-painel-three.vercel.app>

O painel é usado **no ar**, centralizado via Git/Vercel, porque o Rafael opera de
mais de um PC. Nada de arquivo local, `localStorage` ou build local como fonte
persistente.

---

## Estrutura

```
AGENTS.md                     Fonte da verdade operacional
CLAUDE.md                     Instruções do agente + eventos pessoais
.claude/commands/briefing.md  Comando /briefing
Dashboard/
  db/                         FONTE DA VERDADE DOS DADOS
    SCHEMA.md                 Schema de cada arquivo
    clients.json              Clientes
    contributions.json        Aportes
    activities.json           Atividades
    meetings.json             Reuniões
    memories.json             Memórias
    financeiro.json           Saldos atuais
    saldos/YYYY-MM-DD.json    Snapshots diários
  dados.js                    GERADO — não editar
  painel/                     Fontes do painel
scripts/
  validate-db.mjs             Validação da base
  build-dados.mjs             Gerador do dados.js
  dias-uteis.mjs              Cadência de contato
.github/workflows/publish.yml Pipeline de publicação
```

---

## Comandos

```bash
npm run validate                      # valida a base — rode antes de todo commit
npm run build                         # regenera dados.js (diagnóstico local)
node scripts/dias-uteis.mjs 2026-07-27 N2
```

## Fluxo de alteração

```bash
git status --short --branch    # 1. entender o que já está pendente
# 2. editar Dashboard/db/*.json  (Node ou Python, UTF-8 — nunca via echo/PowerShell)
npm run validate               # 3. validar
git diff                       # 4. REVISAR o diff
git add -A && git commit -m "..."
git push -u origin master      # 5. a Action publica sozinha
```

---

## Regras que não se negociam

- `Dashboard/dados.js` é **gerado**. Não editar à mão.
- `jarvis-painel` é **gerado**. Não commitar lá.
- UTF-8 sempre. PowerShell corrompe acento — usar Node/Python com encoding explícito.
- Aporte efetivado entra com status **`"Concluído"`**. D+1/D+2 não deixa pendente.
- Valor de aporte não informado fica **em branco** + observação padrão. Não estimar.
- Todo aporte conta como contato → atualizar `ultimoContato` / `proximoContato`.
- Cadência: **N1 +7** · **N2 +15** · **N3 +30** dias corridos. Única exceção:
  se cair em fim de semana, empurra para a próxima segunda-feira (feriados não
  deslocam).
- Não avançar contato com demanda em aberto.

---

## Configuração necessária

O workflow precisa do secret **`PAINEL_TOKEN`** — um PAT com escopo `repo` e
acesso de escrita ao `rafamartini06/jarvis-painel`.

`Settings → Secrets and variables → Actions → New repository secret`
