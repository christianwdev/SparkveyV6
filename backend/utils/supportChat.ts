import { createId } from '@paralleldrive/cuid2';
import { MongoServerError } from 'mongodb';

// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import {
  getSupportAutoAckKind,
  SUPPORT_AUTO_ACK_MESSAGES,
  SUPPORT_AUTO_ACK_STALE_MS,
} from 'backend/constants/supportAutoAck';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';
import { getUserAvatarURL } from 'backend/utils/avatar';
import { matchSupportCannedResponse } from 'backend/utils/supportCannedMatch';

// Types
import type { Filter } from 'mongodb';
import type FunctionResponse from 'types/FunctionResponse';
import type ChatConversation from 'types/ChatConversation';
import type ChatMessage from 'types/ChatMessage';
import { SUPPORT_SYSTEM_SENDER_ID } from 'types/ChatMessage';
import type SanitizedChatConversation from 'types/SanitizedChatConversation';
import type SanitizedUserSupportChat from 'types/SanitizedUserSupportChat';
import type InternalUser from 'types/User/InternalUser';
import { CANNED_RESPONSES } from 'types/SupportCannedResponses';

export type GetUserSupportConversationError = 'internalServerError';
export type GetAdminSupportConversationsError = 'internalServerError';
export type GetAdminSupportConversationError = 'notFound' | 'internalServerError';
export type CreateUserSupportMessageError = 'emptyMessage' | 'messageTooLong' | 'internalServerError';
export type CreateAdminSupportMessageError = 'emptyMessage' | 'messageTooLong' | 'notFound' | 'internalServerError';
export type CreateAdminSupportConversationError = 'notFound' | 'internalServerError';
export type MarkSupportChatReadError = 'notFound' | 'internalServerError';
export type SendSupportAutoAckError = 'internalServerError';
export type SendSupportCannedReplyError = 'internalServerError';

const MESSAGE_MAX_LENGTH = 1000;
const USER_MESSAGE_LIMIT = 50;
const ADMIN_MESSAGE_LIMIT = 100;
const ADMIN_CONVERSATION_LIMIT = 20;
const SUPPORT_CANNED_HISTORY_LIMIT = 8;
const IMAGE_EXTENSION_REGEX = /\.(png|jpe?g|webp|gif|bmp)$/i;
const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION_REGEX = /[)\],.:;!?]+$/;

export async function getUserSupportConversation(
  {
    userID,
  }: {
    userID: string;
  },
): Promise<FunctionResponse<SanitizedUserSupportChat | null, GetUserSupportConversationError>> {
  try {
    const { db } = getGlobalObject();

    const [ conversation ] = await db.collection<ChatConversation>(DatabaseCollections.chatConversations).aggregate<{
      conversationID: string,
      userID: string,
      lastMessageTimestamp?: number,
      unreadCountUser: number,
      status: SanitizedUserSupportChat['status'],
      messages: ChatMessage[],
      lastAgentID?: string,
      lastAgent?: {
        username: string,
        avatar?: string,
      },
    }>([
      {
        $match: { userID },
      },
      {
        $lookup: {
          from: DatabaseCollections.chatMessages,
          localField: 'conversationID',
          foreignField: 'conversationID',
          as: 'messages',
          pipeline: [
            { $sort: { timestamp: -1 } },
            { $limit: USER_MESSAGE_LIMIT },
            { $project: { _id: 0 } },
          ],
        },
      },
      {
        $lookup: {
          from: DatabaseCollections.users,
          localField: 'lastAgentID',
          foreignField: 'userID',
          as: 'lastAgent',
          pipeline: [
            {
              $project: {
                _id: 0,
                username: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$lastAgent',
          preserveNullAndEmptyArrays: true,
        },
      },
      { $limit: 1 },
    ]).toArray();

    if (!conversation) return { ok: true, data: null };

    const sanitized: SanitizedUserSupportChat = {
      conversationID: conversation.conversationID,
      userID: conversation.userID,
      lastMessageTimestamp: conversation.lastMessageTimestamp ?? 0,
      unreadCount: conversation.unreadCountUser,
      status: conversation.status,
      messages: conversation.messages ?? [],
      supportAgent: conversation.lastAgent
        ? {
          username: conversation.lastAgent.username,
          avatar: conversation.lastAgentID
            ? getUserAvatarURL(conversation.lastAgentID)
            : undefined,
        }
        : null,
    };

    return { ok: true, data: sanitized };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getAdminSupportConversations(): Promise<
  FunctionResponse<SanitizedChatConversation[], GetAdminSupportConversationsError>
> {
  try {
    const conversations = await aggregateAdminConversations({
      match: {
        lastMessageTimestamp: { $exists: true },
      },
      limit: ADMIN_CONVERSATION_LIMIT,
    });

    return { ok: true, data: conversations };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getAdminSupportConversation(
  {
    conversationID,
    userID,
  }: {
    conversationID?: string;
    userID?: string;
  },
): Promise<FunctionResponse<SanitizedChatConversation, GetAdminSupportConversationError>> {
  try {
    const match: Filter<ChatConversation> = {};
    if (conversationID) match.conversationID = conversationID;
    if (userID) match.userID = userID;
    if (!match.conversationID && !match.userID) return { ok: false, error: 'notFound' };

    const [ conversation ] = await aggregateAdminConversations({
      match,
      limit: 1,
    });

    if (!conversation) return { ok: false, error: 'notFound' };

    return { ok: true, data: conversation };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function createUserSupportMessage(
  {
    user,
    message,
  }: {
    user: InternalUser;
    message: string;
  },
): Promise<FunctionResponse<{
  message: ChatMessage,
  conversation: ChatConversation,
}, CreateUserSupportMessageError>> {
  try {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return { ok: false, error: 'emptyMessage' };
    if (trimmedMessage.length > MESSAGE_MAX_LENGTH) return { ok: false, error: 'messageTooLong' };

    const { db } = getGlobalObject();
    const timestamp = Date.now();
    const insertedConversationID = createId();

    let conversation: ChatConversation | null = null;

    try {
      conversation = await db.collection<ChatConversation>(DatabaseCollections.chatConversations).findOneAndUpdate(
        { userID: user.userID },
        {
          $set: {
            status: 'active',
            lastMessageTimestamp: timestamp,
          },
          $setOnInsert: {
            conversationID: insertedConversationID,
            userID: user.userID,
            unreadCountUser: 0,
          },
          $inc: {
            unreadCountAdmin: 1,
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
        },
      );
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
    }

    if (!conversation) {
      conversation = await recoverUpsertedConversation({
        userID: user.userID,
        timestamp,
      });
    }

    if (!conversation) return { ok: false, error: 'internalServerError' };

    const chatMessage: ChatMessage = {
      messageID: createId(),
      conversationID: conversation.conversationID,
      senderID: user.userID,
      senderType: 'user',
      message: trimmedMessage,
      imageEmbeds: extractImageEmbeds(trimmedMessage),
      timestamp,
      read: false,
    };

    await db.collection<ChatMessage>(DatabaseCollections.chatMessages).insertOne(chatMessage);

    return {
      ok: true,
      data: {
        message: chatMessage,
        conversation,
      },
    };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function createAdminSupportMessage(
  {
    admin,
    conversationID,
    message,
  }: {
    admin: InternalUser;
    conversationID: string;
    message: string;
  },
): Promise<FunctionResponse<{
  message: ChatMessage,
  conversation: ChatConversation,
  agentInfo: SanitizedUserSupportChat['supportAgent'],
}, CreateAdminSupportMessageError>> {
  try {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return { ok: false, error: 'emptyMessage' };
    if (trimmedMessage.length > MESSAGE_MAX_LENGTH) return { ok: false, error: 'messageTooLong' };

    const { db } = getGlobalObject();
    const timestamp = Date.now();

    const conversation = await db.collection<ChatConversation>(DatabaseCollections.chatConversations).findOneAndUpdate(
      { conversationID },
      {
        $set: {
          lastMessageTimestamp: timestamp,
          lastAgentID: admin.userID,
          lastSupportReplyAt: timestamp,
          status: 'active',
        },
        $inc: {
          unreadCountUser: 1,
        },
      },
      {
        returnDocument: 'after',
      },
    );

    if (!conversation) return { ok: false, error: 'notFound' };

    const chatMessage: ChatMessage = {
      messageID: createId(),
      conversationID: conversation.conversationID,
      senderID: admin.userID,
      senderType: 'admin',
      message: trimmedMessage,
      imageEmbeds: extractImageEmbeds(trimmedMessage),
      timestamp,
      read: false,
    };

    await db.collection<ChatMessage>(DatabaseCollections.chatMessages).insertOne(chatMessage);

    const agentInfo: SanitizedUserSupportChat['supportAgent'] = {
      username: admin.username,
      avatar: getUserAvatarURL(admin.userID),
    };

    return {
      ok: true,
      data: {
        message: chatMessage,
        conversation,
        agentInfo,
      },
    };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function maybeSendSupportAutoAck(
  {
    conversation,
  }: {
    conversation: ChatConversation,
  },
): Promise<FunctionResponse<ChatMessage | null, SendSupportAutoAckError>> {
  try {
    const { db } = getGlobalObject();
    const now = Date.now();
    let lastAdminMessageAt: number | undefined;

    if (conversation.lastSupportReplyAt == null) {
      const lastAdminMessage = await db.collection<ChatMessage>(DatabaseCollections.chatMessages).findOne(
        {
          conversationID: conversation.conversationID,
          senderType: 'admin',
        },
        {
          sort: { timestamp: -1 },
          projection: { timestamp: 1 },
        },
      );

      lastAdminMessageAt = lastAdminMessage?.timestamp;
    }

    const kind = getSupportAutoAckKind({
      lastSupportReplyAt: conversation.lastSupportReplyAt,
      lastAdminMessageAt,
      now,
    });

    if (!kind) {
      if (conversation.lastSupportReplyAt == null && lastAdminMessageAt != null) {
        await db.collection<ChatConversation>(DatabaseCollections.chatConversations).updateOne(
          {
            conversationID: conversation.conversationID,
            lastSupportReplyAt: { $exists: false },
          },
          {
            $set: { lastSupportReplyAt: lastAdminMessageAt },
          },
        );
      }

      return { ok: true, data: null };
    }

    const chatMessage = await insertSystemSupportMessage({
      conversationID: conversation.conversationID,
      body: SUPPORT_AUTO_ACK_MESSAGES[kind],
      requireStale: true,
    });

    return { ok: true, data: chatMessage };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function maybeSendSupportCannedReply(
  {
    conversation,
    userMessage,
    userMessageID,
  }: {
    conversation: ChatConversation,
    userMessage: string,
    userMessageID: string,
  },
): Promise<FunctionResponse<ChatMessage | null, SendSupportCannedReplyError>> {
  try {
    const { db } = getGlobalObject();
    const recent = await db.collection<ChatMessage>(DatabaseCollections.chatMessages).find(
      { conversationID: conversation.conversationID },
    ).sort({ timestamp: -1 }).limit(SUPPORT_CANNED_HISTORY_LIMIT).toArray();

    const history = recent
      .filter(item => item.messageID !== userMessageID)
      .slice()
      .reverse();

    const matchID = await matchSupportCannedResponse({
      userMessage,
      history,
    });
    if (!matchID) return { ok: true, data: null };

    const template = CANNED_RESPONSES.find(item => item.id === matchID);
    if (!template) return { ok: true, data: null };

    const alreadySent = recent.some(item => (
      item.senderType === 'admin' && item.message === template.body
    ));
    if (alreadySent) return { ok: true, data: null };

    const chatMessage = await insertSystemSupportMessage({
      conversationID: conversation.conversationID,
      body: template.body,
      requireStale: false,
    });

    return { ok: true, data: chatMessage };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function createAdminSupportConversation(
  {
    userID,
    agentID,
  }: {
    userID: string;
    agentID: string;
  },
): Promise<FunctionResponse<SanitizedChatConversation, CreateAdminSupportConversationError>> {
  try {
    const existing = await getAdminSupportConversation({ userID });
    if (existing.ok) return existing;
    if (existing.error !== 'notFound') return existing;

    const { db } = getGlobalObject();
    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOne(
      { userID, deletedAt: { $exists: false } },
      { projection: { userID: 1, username: 1, avatar: 1 } },
    );

    if (!user) return { ok: false, error: 'notFound' };

    const conversation: ChatConversation = {
      conversationID: createId(),
      userID,
      lastMessageTimestamp: Date.now(),
      unreadCountUser: 0,
      unreadCountAdmin: 0,
      status: 'active',
      lastAgentID: agentID,
    };

    try {
      await db.collection<ChatConversation>(DatabaseCollections.chatConversations).insertOne(conversation);
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;

      const raced = await getAdminSupportConversation({ userID });
      if (raced.ok) return raced;
      if (raced.error !== 'notFound') return raced;

      return { ok: false, error: 'internalServerError' };
    }

    const sanitized: SanitizedChatConversation = {
      conversationID: conversation.conversationID,
      userID,
      lastMessageTimestamp: conversation.lastMessageTimestamp,
      unreadCountUser: 0,
      unreadCountAdmin: 0,
      status: 'active',
      user: {
        username: user.username,
        userID: user.userID,
        avatar: getUserAvatarURL(user.userID),
      },
      messages: [],
    };

    return { ok: true, data: sanitized };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function markSupportChatRead(
  {
    userID,
    conversationID,
    asAdmin,
  }: {
    userID: string;
    conversationID?: string;
    asAdmin: boolean;
  },
): Promise<FunctionResponse<undefined, MarkSupportChatReadError>> {
  try {
    const { db } = getGlobalObject();
    const conversations = db.collection<ChatConversation>(DatabaseCollections.chatConversations);

    const conversation = asAdmin
      ? await conversations.findOne({ conversationID })
      : await conversations.findOne({ userID });

    if (!conversation) return { ok: false, error: 'notFound' };

    // Users can only mark their own thread. Admins already passed permission checks.
    if (!asAdmin && conversation.userID !== userID) {
      return { ok: false, error: 'notFound' };
    }

    const unreadField = asAdmin ? 'unreadCountAdmin' : 'unreadCountUser';
    const senderType = asAdmin ? 'user' : 'admin';

    await Promise.all([
      conversations.updateOne(
        { conversationID: conversation.conversationID },
        { $set: { [unreadField]: 0 } },
      ),
      db.collection<ChatMessage>(DatabaseCollections.chatMessages).updateMany(
        {
          conversationID: conversation.conversationID,
          senderType,
          read: false,
        },
        { $set: { read: true } },
      ),
    ]);

    return { ok: true, data: undefined };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

async function aggregateAdminConversations(
  {
    match,
    limit,
  }: {
    match: Filter<ChatConversation>;
    limit: number;
  },
): Promise<SanitizedChatConversation[]> {
  const { db } = getGlobalObject();

  const conversations = await db.collection<ChatConversation>(DatabaseCollections.chatConversations).aggregate<SanitizedChatConversation>([
    { $match: match },
    { $sort: { lastMessageTimestamp: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: DatabaseCollections.users,
        localField: 'userID',
        foreignField: 'userID',
        as: 'user',
        pipeline: [
          {
            $project: {
              _id: 0,
              username: 1,
              userID: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$user',
      },
    },
    {
      $lookup: {
        from: DatabaseCollections.chatMessages,
        localField: 'conversationID',
        foreignField: 'conversationID',
        as: 'messages',
        pipeline: [
          { $sort: { timestamp: -1 } },
          { $limit: ADMIN_MESSAGE_LIMIT },
          { $project: { _id: 0 } },
        ],
      },
    },
    { $project: { _id: 0 } },
  ]).toArray();

  return conversations.map(conversation => ({
    ...conversation,
    user: {
      ...conversation.user,
      avatar: getUserAvatarURL(conversation.user.userID),
    },
  }));
}

async function recoverUpsertedConversation(
  {
    userID,
    timestamp,
  }: {
    userID: string;
    timestamp: number;
  },
): Promise<ChatConversation | null> {
  const { db } = getGlobalObject();

  try {
    return await db.collection<ChatConversation>(DatabaseCollections.chatConversations).findOneAndUpdate(
      { userID },
      {
        $set: {
          status: 'active',
          lastMessageTimestamp: timestamp,
        },
        $inc: {
          unreadCountAdmin: 1,
        },
      },
      {
        returnDocument: 'after',
      },
    );
  } catch (error) {
    if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;

    return db.collection<ChatConversation>(DatabaseCollections.chatConversations).findOne({ userID });
  }
}

async function insertSystemSupportMessage(
  {
    conversationID,
    body,
    requireStale,
  }: {
    conversationID: string,
    body: string,
    requireStale: boolean,
  },
): Promise<ChatMessage | null> {
  const { db, mongoClient } = getGlobalObject();
  const now = Date.now();
  const filter: Filter<ChatConversation> = { conversationID };

  if (requireStale) {
    const staleBefore = now - SUPPORT_AUTO_ACK_STALE_MS;

    filter.$or = [
      { lastSupportReplyAt: { $exists: false } },
      { lastSupportReplyAt: { $lt: staleBefore } },
    ];
  }

  const chatMessage: ChatMessage = {
    messageID: createId(),
    conversationID,
    senderID: SUPPORT_SYSTEM_SENDER_ID,
    senderType: 'admin',
    message: body,
    imageEmbeds: [],
    timestamp: now,
    read: false,
  };

  const mongoSession = mongoClient.startSession();

  try {
    mongoSession.startTransaction();

    const claimed = await db.collection<ChatConversation>(DatabaseCollections.chatConversations).findOneAndUpdate(
      filter,
      {
        $set: {
          lastSupportReplyAt: now,
          lastMessageTimestamp: now,
          status: 'active',
        },
        $inc: {
          unreadCountUser: 1,
        },
      },
      {
        returnDocument: 'after',
        session: mongoSession,
      },
    );

    if (!claimed) {
      await mongoSession.abortTransaction();

      return null;
    }

    await db.collection<ChatMessage>(DatabaseCollections.chatMessages).insertOne(chatMessage, {
      session: mongoSession,
    });

    await mongoSession.commitTransaction();

    return chatMessage;
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }

    throw error;
  } finally {
    await mongoSession.endSession();
  }
}

function extractImageEmbeds(message: string): string[] {
  const embeds: string[] = [];

  for (const match of message.matchAll(URL_REGEX)) {
    const [ rawUrl ] = match;
    const normalized = normalizeHttpUrl(rawUrl);
    if (!normalized) continue;

    try {
      const parsed = new URL(normalized);
      if (!IMAGE_EXTENSION_REGEX.test(parsed.pathname)) continue;
      if (embeds.includes(parsed.toString())) continue;

      embeds.push(parsed.toString());
    } catch {
      continue;
    }
  }

  return embeds;
}

function normalizeHttpUrl(url: string): string | null {
  const sanitizedUrl = url.replace(TRAILING_PUNCTUATION_REGEX, '');

  try {
    const parsed = new URL(sanitizedUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

    return parsed.toString();
  } catch {
    return null;
  }
}
