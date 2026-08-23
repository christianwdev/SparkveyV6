type ChatConversation = {
  conversationID: string,
  userID: string,
  lastMessageTimestamp: number,
  unreadCountUser: number,
  unreadCountAdmin: number,
  status: 'active' | 'closed',
  lastAgentID?: string,
  lastSupportReplyAt?: number,
  sentCannedReplyIDs?: string[],
};

export default ChatConversation;
