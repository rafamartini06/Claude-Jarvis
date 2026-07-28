# Schema da base — `Dashboard/db/`

Cada arquivo é uma **lista JSON com um objeto por linha**:

```json
[
{"id":"...","campo":"valor"},
{"id":"...","campo":"valor"}
]
```

Abre em `[`, fecha em `]`, cada objeto ocupa exatamente uma linha, vírgula no
fim de todas menos a última. Formato mantido para diff legível no Git.

UTF-8 sempre. Ver `CLAUDE.md` §4 sobre PowerShell e acentuação.

---

## `clients.json`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | Identificador estável. Não reutilizar. |
| `nome` | string | Nome completo. |
| `apelido` | string | Nome alternativo pelo qual o cliente é chamado. Opcional. |
| `nivel` | `"N1"` \| `"N2"` \| `"N3"` | Define a cadência de contato. |
| `pl` | number | Patrimônio sob gestão, em BRL. |
| `aniversario` | string | `DD/MM`. |
| `ultimoContato` | string | **Data por extenso**: `27 de julho de 2026`. |
| `proximoContato` | string | **Data por extenso**. Sempre dia útil. |
| `demandaAberta` | boolean | `true` trava o avanço de `proximoContato`. |
| `observacoes` | string | Livre. Opcional. |

Cadência: N1 `+7` dias úteis · N2 `+15` · N3 `+30`. Ver `AGENTS.md` §5.

---

## `contributions.json`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `clienteId` | string | FK → `clients.json.id`. |
| `cliente` | string | Nome, redundante para leitura do diff. |
| `data` | string | `YYYY-MM-DD`. |
| `ativo` | string | Ex.: `CRI Rede D'Or 21K0001806`. |
| `tipo` | string | Ex.: `CRI`, `CDB`, `FII`, `Prefixado`. |
| `indexador` | string | Ex.: `IPCA + 8,22%`, `15,4% a.a.`. Opcional. |
| `vencimento` | string | `YYYY-MM-DD`. Opcional. |
| `quantidade` | number | Cotas, quando aplicável. Opcional. |
| `valor` | number \| `""` | **Vazio se não informado.** Não estimar. |
| `status` | string | Ver abaixo. |
| `observacao` | string | Opcional. |

### `status`

Sempre **`"Concluído"`** para aporte efetivado. Aplicações marcadas na corretora
como *Processando*, *Em andamento* ou *Solicitada* já contam como efetivadas.
Liquidação D+1/D+2 **não** deixa o aporte pendente.

### Valor ausente

`valor: ""` **e** `observacao: "Valor financeiro não informado pelo Rafael."`

### Efeito colateral obrigatório

Todo aporte é um contato. Ao inserir aqui, atualizar em `clients.json`:
`ultimoContato` (data do aporte, por extenso) e `proximoContato` (cadência, dia
útil).

---

## `activities.json`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `clienteId` | string | FK. |
| `data` | string | `YYYY-MM-DD`. |
| `tipo` | string | Ex.: `contato`, `aniversario`, `demanda`, `aporte`. |
| `descricao` | string | |
| `status` | string | `Aberto` \| `Concluído`. |

Atividade com `status: "Aberto"` é demanda concreta — entra no briefing e trava
o avanço de contato do cliente.

---

## `meetings.json`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `clienteId` | string | FK. |
| `data` | string | `YYYY-MM-DD`. |
| `hora` | string | `HH:MM`. |
| `assunto` | string | |
| `status` | string | `Agendada` \| `Realizada` \| `Cancelada`. |

---

## `memories.json`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `clienteId` | string | FK. |
| `data` | string | `YYYY-MM-DD`. |
| `texto` | string | Fato a lembrar sobre o cliente. |

---

## `financeiro.json`

Saldos **atuais**. Regravado por inteiro a cada atualização da planilha.

| Campo | Tipo | Notas |
|---|---|---|
| `clienteId` | string | FK. |
| `cliente` | string | |
| `saldoConta` | number | Saldo em conta, BRL. |
| `pl` | number | Patrimônio total, BRL. |
| `dataReferencia` | string | `YYYY-MM-DD` — **data real do arquivo**, não a de hoje. |

Origem: `Listagem de clientes.xlsx`, pasta "Saldo em conta" do Drive AUVP.

Gatilho de briefing: `saldoConta > 0.03 * pl` **e** `saldoConta > 10000`.

---

## `saldos/YYYY-MM-DD.json`

Snapshot imutável, mesmo schema de `financeiro.json`. Nome do arquivo = data real
do snapshot. Nunca sobrescrever um snapshot existente.
