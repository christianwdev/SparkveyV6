export const SUPPORT_AUTO_ACK_STALE_MS = 86_400_000; // 24 hours

export const SUPPORT_AUTO_ACK_MESSAGES = {
  first: 'Thanks for reaching out! We\'ve received your message and a member of our team will reply within 24-48 hours.',
  followUp: 'Thanks for following up. We\'ve received your message and a member of our team will reply within 24-48 hours.',
} as const;

export type SupportAutoAckKind = keyof typeof SUPPORT_AUTO_ACK_MESSAGES;

export function getSupportAutoAckKind(
  {
    lastSupportReplyAt,
    lastAdminMessageAt,
    now,
  }: {
    lastSupportReplyAt?: number,
    lastAdminMessageAt?: number,
    now: number,
  },
): SupportAutoAckKind | null {
  const lastReplyAt = lastSupportReplyAt ?? lastAdminMessageAt;
  if (lastReplyAt == null) return 'first';
  if (now - lastReplyAt >= SUPPORT_AUTO_ACK_STALE_MS) return 'followUp';

  return null;
}
