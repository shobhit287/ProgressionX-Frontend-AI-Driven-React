// Port of core/groq_client.py — calls Groq's OpenAI-compatible endpoint
// straight from the browser with a key the user pastes into Profile. The
// key lives in localStorage only (deliberately NOT in the backup file).

import { DomainError } from '../errors';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const KEY_STORAGE = 'progressionx.groqApiKey';
const MODEL_STORAGE = 'progressionx.groqModel';

export function getGroqApiKey(): string {
  try { return localStorage.getItem(KEY_STORAGE) ?? ''; } catch { return ''; }
}

export function setGroqApiKey(key: string): void {
  try {
    if (key.trim()) localStorage.setItem(KEY_STORAGE, key.trim());
    else localStorage.removeItem(KEY_STORAGE);
  } catch { /* storage unavailable — key just won't persist */ }
}

export function getGroqModel(): string {
  try { return localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL; } catch { return DEFAULT_MODEL; }
}

export function setGroqModel(model: string): void {
  try {
    if (model.trim() && model.trim() !== DEFAULT_MODEL) localStorage.setItem(MODEL_STORAGE, model.trim());
    else localStorage.removeItem(MODEL_STORAGE);
  } catch { /* ignore */ }
}

export function hasGroqApiKey(): boolean {
  return getGroqApiKey().length > 0;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletion {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
}

async function chat(messages: ChatMessage[], maxTokens: number, json: boolean): Promise<string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new DomainError('Add your Groq API key in Profile to use AI features.', 401);
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new DomainError('AI needs an internet connection. Everything else works offline.', 503);
  }

  let res: Response;
  try {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getGroqModel(),
        messages,
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
  } catch {
    throw new DomainError('Could not reach the AI service. Check your connection.', 503);
  }

  if (res.status === 429) {
    throw new DomainError('AI is temporarily busy. Please try again in a minute.', 503);
  }
  if (res.status === 401 || res.status === 403) {
    throw new DomainError('Groq rejected the API key. Check it in Profile.', 401);
  }
  if (!res.ok) {
    let detail = '';
    try { detail = ((await res.json()) as ChatCompletion).error?.message ?? ''; } catch { /* ignore */ }
    throw new DomainError(
      detail ? `AI error: ${detail}` : 'AI service is currently unavailable. Please try again later.',
      503,
    );
  }

  const data = (await res.json()) as ChatCompletion;
  return data.choices?.[0]?.message?.content ?? '';
}

export async function generate(
  prompt: string,
  systemInstruction: string,
  maxTokens = 1024,
): Promise<string> {
  return chat(
    [{ role: 'system', content: systemInstruction }, { role: 'user', content: prompt }],
    maxTokens,
    false,
  );
}

// Reserve tokens for system prompt + current user message + response.
const MAX_HISTORY_TOKENS = 2048;
const estimateTokens = (text: string) => Math.floor(text.length / 4);

function trimHistory(history: { role: string; content: string }[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  let used = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    const t = estimateTokens(m.content);
    if (used + t > MAX_HISTORY_TOKENS) break;
    out.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
    used += t;
  }
  return out.reverse();
}

export async function generateWithHistory(
  prompt: string,
  systemInstruction: string,
  history: { role: string; content: string }[],
  maxTokens = 1024,
): Promise<string> {
  return chat(
    [
      { role: 'system', content: systemInstruction },
      ...trimHistory(history),
      { role: 'user', content: prompt },
    ],
    maxTokens,
    false,
  );
}

function stripFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.includes('\n') ? cleaned.slice(cleaned.indexOf('\n') + 1) : cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3).trim();
  }
  return cleaned;
}

/** Parse JSON from LLM output; degrades to the analysis shape on failure. */
export function parseJsonLoose(text: string | null | undefined): Record<string, unknown> {
  if (!text) return { analysis: '', suggestions: [] };
  try {
    const parsed: unknown = JSON.parse(stripFences(text));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch { /* fall through */ }
  return { analysis: text, suggestions: [] };
}

export async function generateJson(
  prompt: string,
  systemInstruction: string,
  maxTokens = 1024,
): Promise<Record<string, unknown>> {
  const raw = await chat(
    [{ role: 'system', content: systemInstruction }, { role: 'user', content: prompt }],
    maxTokens,
    true,
  );
  return parseJsonLoose(raw);
}
