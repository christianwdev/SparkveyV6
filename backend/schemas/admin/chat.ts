import { z } from 'zod';

export const adminChatConversationIDSchema = z.object({
  conversationID: z.string().trim().min(1).max(64),
});

export const adminChatCreateBodySchema = z.object({
  userID: z.string().trim().min(1).max(64),
});
