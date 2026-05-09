# Treino Brian — Tracker

HTML estático para acompanhar o plano de treino de 8 semanas.

## Feedback loop

Os registros ficam no `localStorage` do navegador do celular. Para o Charlie/PA ajustar o treino:

1. Abrir o treino do dia
2. Preencher execução real, RPE, sono, energia, dor e notas
3. Clicar em **Salvar treino**
4. Clicar em **Copiar** ou **Enviar/Compartilhar**
5. Colar/enviar o resumo para o Charlie

Sem backend, não há sincronização automática dos dados.

## Automação via ntfy

A automação usa um tópico privado/aleatório do ntfy. O tópico não fica hardcoded no HTML público; ele é salvo no navegador quando o usuário abre a URL com `?ntfy=<topic>`.

Fluxo:

1. Abrir uma vez a URL privada `https://.../training-tracker/?ntfy=<topic>`
2. O app salva o tópico no `localStorage` e limpa a query string
3. Depois de registrar um treino, clicar **Enviar Charlie**
4. O app publica um JSON em `https://ntfy.sh/<topic>`
5. Um cron do OpenClaw checa o tópico e processa novos treinos

Limite: topic secrecy não é autenticação forte. Para produção real, migrar para backend próprio com token server-side.

### Ingest script

`node check-submissions.mjs` lê o tópico configurado em `memory/personal/training-ingest-state.json`, compara com o último id processado, grava novos treinos em `memory/personal/training-log.jsonl` e imprime um JSON com `training` e `items`.
