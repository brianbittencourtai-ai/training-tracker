# Treino Brian — Tracker

HTML estático para acompanhar o plano de treino de 8 semanas.

## Feedback loop

Os registros ficam no `localStorage` do navegador do celular e, quando o Supabase estiver configurado, também são enviados para a tabela `training_sessions`.

1. Abrir o treino do dia
2. Preencher execução real, RPE, sono, energia, dor e notas
3. Clicar em **Salvar treino**
4. Se o Supabase estiver ativo, o app salva no banco automaticamente
5. Se não estiver ativo, clicar em **Copiar** ou **Enviar/Compartilhar**

Sem Supabase configurado, não há sincronização automática dos dados.

## Supabase

Arquivos incluídos:

- `supabase/migrations/001_training_sessions.sql`: cria a tabela `training_sessions`
- `supabase/functions/ingest-training-session/index.ts`: Edge Function que valida um token privado e grava/upserta o treino

Deploy esperado:

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase secrets set TRAINING_INGEST_TOKEN=<private-token> TRAINING_OWNER_KEY=brian
supabase functions deploy ingest-training-session --no-verify-jwt
```

Depois de publicar, abrir uma vez no celular:

```text
https://brianbittencourtai-ai.github.io/training-tracker/?supabase_ingest_url=https://<project-ref>.supabase.co/functions/v1/ingest-training-session&training_token=<private-token>
```

O app salva essa configuração no `localStorage` e remove os parâmetros da URL.

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
