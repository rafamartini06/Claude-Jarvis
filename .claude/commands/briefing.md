---
description: Briefing operacional diário — somente itens acionáveis
---

# /briefing

Aceitar também a grafia `/breafing`.

Antes de tudo: ler `AGENTS.md` e `CLAUDE.md` por completo e rodar
`git status --short --branch`.

## Passo 1 — Saldos

Se houver planilha nova de saldos ("Listagem de clientes.xlsx", pasta "Saldo em
conta" do Drive AUVP):

1. Regravar `Dashboard/db/financeiro.json`.
2. Criar `Dashboard/db/saldos/YYYY-MM-DD.json` com a **data real do snapshot**.
3. Validar e publicar (commit + push).

Sem planilha nova: seguir com os saldos correntes de `financeiro.json` e dizer
de quando é o último snapshot.

## Passo 2 — Levantar o acionável

Ler a base e apurar apenas estes seis blocos:

1. **Saldo alto em conta** — saldo `> 3% do PL` **e** `> R$ 10.000`.
2. **Vencimentos de RF próximos.**
3. **Aniversários.**
4. **Contatos vencidos / hoje / próximos** (`proximoContato` em `clients.json`).
5. **Agenda** (`meetings.json` + Calendar, se disponível).
6. **Demandas concretas** em aberto (`activities.json`).

## Passo 3 — Saída

Formato: lista por bloco, uma linha por item, cliente + fato + ação sugerida.
Omitir blocos vazios — não escrever "nada a reportar" para cada um.

### Regras de corte

- **Só o acionável.** Nada de monitoramento passivo.
- Item sem ação clara **não entra**.
- Não repetir item já tratado no dia.

### Bloqueios

WhatsApp, Calendar ou Drive indisponíveis: **declarar o bloqueio explicitamente**
no topo do briefing e seguir com o que a base permite. Nunca preencher a lacuna
com suposição.

## Passo 4 — Fechamento

Se algo foi alterado e publicado, informar o **hash do commit**.
