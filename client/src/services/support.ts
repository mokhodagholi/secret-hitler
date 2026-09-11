export const SUPPORT_TOPICS = ['help', 'suggestion', 'criticism'] as const;

export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

export const SUPPORT_DESCRIPTION_MIN = 3;
export const SUPPORT_DESCRIPTION_MAX = 2000;

export function isSupportTopic(value: unknown): value is SupportTopic {
  return typeof value === 'string' && (SUPPORT_TOPICS as readonly string[]).includes(value);
}

export type SupportErrorCode = 'NETWORK' | 'RATE_LIMITED' | 'UNAVAILABLE' | 'INVALID';

export class SupportError extends Error {
  constructor(readonly code: SupportErrorCode) {
    super(code);
    this.name = 'SupportError';
  }
}

/** POST a letter to `/api/support`. The server stamps the sender id. */
export async function submitSupport(params: {
  topic: SupportTopic;
  description: string;
  clientId: string;
  initData?: string;
}): Promise<void> {
  const description = params.description.trim();
  if (!isSupportTopic(params.topic) || description.length < SUPPORT_DESCRIPTION_MIN) {
    throw new SupportError('INVALID');
  }

  let response: Response;
  try {
    response = await fetch('/api/support', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        topic: params.topic,
        description: description.slice(0, SUPPORT_DESCRIPTION_MAX),
        clientId: params.clientId,
        ...(params.initData ? { initData: params.initData } : {}),
      }),
    });
  } catch {
    throw new SupportError('NETWORK');
  }

  if (response.ok) return;
  if (response.status === 429) throw new SupportError('RATE_LIMITED');
  if (response.status === 503) throw new SupportError('UNAVAILABLE');
  if (response.status === 400) throw new SupportError('INVALID');
  throw new SupportError('NETWORK');
}
