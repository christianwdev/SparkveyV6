export const SUPPORT_AUTO_ACK_STALE_MS = 86_400_000; // 24 hours

export const SUPPORT_AUTO_ACK_MESSAGES = {
  first: 'Thanks for reaching out! We\'ve received your message and a member of our team will reply within 24-48 hours.',
  followUp: 'Thanks for following up. We\'ve received your message and a member of our team will reply within 24-48 hours.',
} as const;

export type SupportAutoAckKind = keyof typeof SUPPORT_AUTO_ACK_MESSAGES;

export function getSupportAutoAckKind(
  {
    lastSupportReplyAt,
    now,
  }: {
    lastSupportReplyAt?: number,
    now: number,
  },
): SupportAutoAckKind | null {
  if (lastSupportReplyAt == null) return 'first';
  if (now - lastSupportReplyAt >= SUPPORT_AUTO_ACK_STALE_MS) return 'followUp';

  return null;
}
