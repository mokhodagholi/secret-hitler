export const SUPPORT_TOPICS = ['help', 'suggestion', 'criticism'] as const;

export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

const TOPIC_LABELS: Record<SupportTopic, string> = {
  help: 'پشتیبانی',
  suggestion: 'پیشنهاد',
  criticism: 'انتقاد',
};

export function isSupportTopic(value: unknown): value is SupportTopic {
  return typeof value === 'string' && (SUPPORT_TOPICS as readonly string[]).includes(value);
}

/** Group chat id from env — numeric for groups, otherwise a username. */
export function parseSupportChatId(raw: string | undefined): number | string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

/** Plain-text letter the bot posts to the support group. */
export function formatSupportLetter(params: {
  topic: SupportTopic;
  description: string;
  senderId: string;
}): string {
  return [TOPIC_LABELS[params.topic], '', `فرستنده: ${params.senderId}`, '', params.description].join(
    '\n',
  );
}
