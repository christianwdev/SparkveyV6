import type ChatMessage from './ChatMessage';

type SanitizedChatConversation = {
  conversationID: string,
  userID: string,
  lastMessageTimestamp: number,
  unreadCountUser: number,
  unreadCountAdmin: number,
  status: 'active' | 'closed',
  user: {
    username: string,
    avatar?: string,
    userID: string,
  },
  messages: ChatMessage[],
};

export default SanitizedChatConversation;
