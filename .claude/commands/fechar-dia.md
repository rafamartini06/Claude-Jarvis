---
description: Fecha o dia — registra reuniões, varre follow-ups e WhatsApp, consolida e publica
---

# /fechar-dia

Aceitar também "fechar dia". O roteiro completo e vigente está no repositório
**`jarvis-crm`**, em `.claude/commands/fechar-dia.md` — siga-o **na íntegra**
(ele prevalece sobre este arquivo). Resumo do que não pode faltar:

1. **Agenda do dia** — ler o Google Calendar, abrir as "Anotações do Gemini" de
   cada reunião de cliente, registrar em `meetings.json` (checar `eventId` antes,
   para não duplicar) e gerar atividades datadas com `origemEventId`.
2. **Saldos** — se houver planilha nova, atualizar `financeiro.json` e o
   snapshot `saldos/<data>.json`.
3. **Varredura de follow-ups (obrigatória)** — regras em `jarvis-crm/AGENTS.md`
   §4g:
   - revisar cada follow-up aberto (`tipo:"Follow-up"`) e fechar só com
     evidência (WhatsApp, extrato BTG ou confirmação do Rafael); aporte
     confirmado vai para `contributions.json` como `Concluído` e avança o contato;
   - aporte lançado hoje (tabela do Rafael = aporte realizado): ler o WhatsApp do
     cliente; sem nenhuma interação depois do envio → follow-up "Conferir
     execução" para D+1 útil (aporte continua lançado); cliente disse que não conseguiu
     aceitar ou ordem expirada → reverter o aporte e retomar o contato para o
     próximo dia útil + "Reenviar ordem";
   - ler o WhatsApp do dia (conector Jamel Street: `list_whatsapp_chats` +
     `get_whatsapp_messages`, instância `rafael-di-martini`, página 1 de cada chat
     com mensagem de hoje): promessas do Rafael ("te envio amanhã", "em 3 dias")
     e pedidos de cliente sem resposta viram follow-up com prazo; confirmações
     ("feito", "aceitei") fecham o follow-up correspondente;
   - casar telefone sem o 9 depois do DDD e pelo contexto da conversa antes de
     marcar um contato como não identificado;
   - recorrentes (🔁 Hilton fee-based até dia 10; Marcus relatórios BTG no 1º
     dia útil): conferir no grupo do cliente se o envio do mês saiu; se saiu,
     concluir e criar a ocorrência do mês seguinte.
4. **Consolidar** — atualizar o bloco de pendências do `jarvis-crm/CLAUDE.md`.
5. **Publicar** — validar, revisar o `git diff`, commit + push no `jarvis-crm`.
   Informar o hash, os follow-ups fechados, os criados (com prazo) e os atrasados.
