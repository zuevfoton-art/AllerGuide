import type { Express, Request, Response } from 'express';
import { buildAskChatPrompt, parseAskChatAnswer } from '@allerguide/ai';
import { ASK_MAX_QUESTION_LENGTH, detectAskDistress } from '@allerguide/core';
import { verifyAuthToken } from '../lib/jwt';
import { logCaughtError } from '../lib/log-caught-error';
import { callScanLlm } from '../services/llm-scan-provider';

export const MAX_ASK_CONTEXT_LINES = 6;
export const MAX_ASK_CONTEXT_LINE_LENGTH = 120;
export const MAX_ASK_HISTORY_TURNS = 6;

type AskHistoryTurn = { role: 'user' | 'assistant'; text: string };

export type ParsedAskInput = {
  question: string;
  locale: string;
  context: string[];
  history: AskHistoryTurn[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLines(value: unknown, max: number, maxLength: number): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) return null;

  const lines: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') return null;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (trimmed.length > maxLength) return null;
    lines.push(trimmed);
  }
  return lines;
}

function parseHistory(value: unknown): AskHistoryTurn[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_ASK_HISTORY_TURNS) return null;

  const turns: AskHistoryTurn[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const role = item.role;
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    if (role !== 'user' && role !== 'assistant') return null;
    if (!text || text.length > ASK_MAX_QUESTION_LENGTH) return null;
    turns.push({ role, text });
  }
  return turns;
}

export function parseAskInput(body: unknown): ParsedAskInput | null {
  if (!isRecord(body)) return null;

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question || question.length > ASK_MAX_QUESTION_LENGTH) return null;

  const locale = typeof body.locale === 'string' ? body.locale.trim() : 'ru';
  if (!/^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/.test(locale)) return null;

  const context = parseLines(body.context, MAX_ASK_CONTEXT_LINES, MAX_ASK_CONTEXT_LINE_LENGTH);
  const history = parseHistory(body.history);
  if (context === null || history === null) return null;

  return { question, locale, context, history };
}

function askEnabled(): boolean {
  return process.env.AI_CHAT_ENABLED === 'true' && process.env.AI_SCAN_ENABLED === 'true';
}

async function resolveIdentity(req: Request): Promise<string | null> {
  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) {
    const payload = await verifyAuthToken(header.slice('Bearer '.length).trim());
    if (payload) return `user:${payload.sub}`;
  }
  if (process.env.SCAN_REQUIRE_AUTH === 'true') return null;
  return `ip:${req.ip ?? 'unknown'}`;
}

/**
 * «Ask» explainer chat (north-star §4.9). Distress wording is answered with a
 * crisis handoff and the model is never called — the client runs the same guard,
 * this is the server-side backstop. Messages are not persisted.
 */
export function registerAskRoutes(app: Express) {
  app.post('/api/ask', async (req: Request, res: Response) => {
    if (!askEnabled()) {
      res.status(503).json({ ok: false, error: 'Ask chat is disabled on this server' });
      return;
    }

    const input = parseAskInput(req.body);
    if (!input) {
      res.status(400).json({ ok: false, error: 'Invalid ask payload' });
      return;
    }

    if (detectAskDistress(input.question)) {
      res.json({ ok: true, handoff: 'sos' });
      return;
    }

    const identity = await resolveIdentity(req);
    if (!identity) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    try {
      const answer = parseAskChatAnswer(await callScanLlm(buildAskChatPrompt(input)));
      if (!answer) {
        res.status(502).json({ ok: false, error: 'Assistant is unavailable' });
        return;
      }
      res.json({ ok: true, answer });
    } catch (error) {
      logCaughtError('ask.chat', error);
      res.status(500).json({ ok: false, error: 'Assistant request failed' });
    }
  });
}
