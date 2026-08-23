type ChatConversation = {
  conversationID: string,
  userID: string,
  lastMessageTimestamp: number,
  unreadCountUser: number,
  unreadCountAdmin: number,
  status: 'active' | 'closed',
  lastAgentID?: string,
};

export default ChatConversation;
