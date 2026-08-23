export const SUPPORT_SYSTEM_SENDER_ID = 'system';

type ChatMessage = {
  messageID: string,
  conversationID: string,
  senderID: string,
  senderType: 'user' | 'admin',
  message: string,
  imageEmbeds: string[],
  timestamp: number,
  read: boolean,
};

export type AdminChatMessagePayload = {
  message: ChatMessage,
  user: {
    userID: string,
    username: string,
    avatar?: string,
  },
};

export default ChatMessage;
