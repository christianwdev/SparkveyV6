import type ChatMessage from './ChatMessage';

type SanitizedUserSupportChat = {
  conversationID: string,
  userID: string,
  lastMessageTimestamp: number,
  unreadCount: number,
  status: 'active' | 'closed',
  messages: ChatMessage[],
  supportAgent: {
    username: string,
    avatar?: string,
  } | null,
};

export default SanitizedUserSupportChat;
