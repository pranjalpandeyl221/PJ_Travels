import type { PlanResponse, StreamEvent } from '../types';
import { mockResponse } from './mockData';

const API_URL = `${import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8002'}/api/v1/trips/plan`;

export async function planTrip(
  prompt: string,
  sessionId?: string,
  useMock = false
): Promise<PlanResponse> {
  if (useMock) {
    await new Promise((r) => setTimeout(r, 1800));
    return mockResponse(prompt);
  }

  const payload: Record<string, unknown> = { user_request: prompt };
  if (sessionId) payload.session_id = sessionId;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    throw new Error(`Backend returned ${res.status}`);
  }

  return res.json();
}

const API_STREAM_URL = `${import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8002'}/api/v1/trips/plan/stream`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function planTripStream(
  prompt: string,
  onEvent: (event: StreamEvent) => void,
  sessionId?: string,
  useMock = false,
): Promise<void> {
  if (useMock) {
    const resp = mockResponse(prompt);
    onEvent({ type: 'session', session_id: 'mock', request: prompt });
    await sleep(400);
    onEvent({ type: 'intent', data: resp.agent_outputs.intent_agent });
    await sleep(600);
    onEvent({ type: 'research', data: resp.agent_outputs.research_agent });
    await sleep(600);
    onEvent({ type: 'itinerary', data: resp.agent_outputs.itinerary_agent });
    await sleep(600);
    onEvent({ type: 'budget', data: resp.agent_outputs.budget_agent });
    await sleep(600);
    onEvent({ type: 'complete', data: resp });
    return;
  }

  const payload: Record<string, unknown> = { user_request: prompt };
  if (sessionId) payload.session_id = sessionId;

  const res = await fetch(API_STREAM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Backend returned ${res.status}: ${text}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        try {
          const event = JSON.parse(trimmed.slice(6)) as StreamEvent;
          onEvent(event);
        } catch {
          console.warn('Failed to parse SSE event:', trimmed.slice(0, 120));
        }
      }
    }
  }
}
