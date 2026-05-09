import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const workspace = resolve(process.cwd(), '..');
const statePath = resolve(workspace, 'memory/personal/training-ingest-state.json');
const logPath = resolve(workspace, 'memory/personal/training-log.jsonl');

function readJson(path, fallback) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
}

const state = readJson(statePath, {});
const topic = state.topic || process.env.TRAINING_NTFY_TOPIC;
if (!topic) {
  console.log(JSON.stringify({ ok: false, error: 'missing_topic' }));
  process.exit(2);
}

const url = `https://ntfy.sh/${encodeURIComponent(topic)}/json?poll=1&since=all`;
const res = await fetch(url);
if (!res.ok) {
  console.log(JSON.stringify({ ok: false, error: `ntfy_http_${res.status}` }));
  process.exit(3);
}
const text = await res.text();
const messages = text.split('\n').filter(Boolean).map(line => JSON.parse(line));
const lastId = state.last_processed_id || null;
let seenLast = !lastId;
const fresh = [];
for (const msg of messages) {
  if (msg.id === lastId) { seenLast = true; continue; }
  if (!seenLast) continue;
  fresh.push(msg);
}

const training = [];
for (const msg of fresh) {
  let payload = null;
  try { payload = JSON.parse(msg.message || '{}'); } catch {}
  if (payload?.kind === 'training_session') {
    training.push({ ntfyId: msg.id, ntfyTime: msg.time, ...payload });
  }
}

mkdirSync(dirname(logPath), { recursive: true });
for (const item of training) {
  appendFileSync(logPath, JSON.stringify(item) + '\n');
}

const newest = messages.at(-1);
if (newest) {
  writeFileSync(statePath, JSON.stringify({ ...state, topic, last_processed_id: newest.id, updated_at: newest.time, checked_at: new Date().toISOString() }, null, 2) + '\n');
}

console.log(JSON.stringify({ ok: true, checked: messages.length, fresh: fresh.length, training: training.length, items: training.map(t => ({ ntfyId: t.ntfyId, date: t.date, day: t.day, week: t.week, summary: t.summary })) }, null, 2));
