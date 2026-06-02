import crypto from 'crypto';
import { getGlobalObject } from 'backend/utils/globalObject';
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Types
import type EmailActionable from 'types/EmailActionable';
import type FunctionResponse from 'types/FunctionResponse';

const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;
const FORGOT_PASSWORD_EXPIRY_MS = 60 * 60 * 1000;

function getExpiryMs(type: EmailActionable['type']) {
  return type === 'verification' ? VERIFICATION_EXPIRY_MS : FORGOT_PASSWORD_EXPIRY_MS;
}

export async function createEmailActionable(
  {
    userID,
    email,
    type,
  }: {
    userID: string;
    email: string;
    type: EmailActionable['type'];
  },
): Promise<FunctionResponse<{ actionableID: string }>> {
  try {
    const { db } = getGlobalObject();
    const issueDate = new Date();
    const actionableID = crypto.randomBytes(32).toString('hex');

    await db.collection<EmailActionable>(DatabaseCollections.emailActionables).updateMany(
      {
        userID,
        type,
        deactivatedAt: { $exists: false },
      },
      {
        $set: {
          deactivatedAt: issueDate,
        },
      },
    );

    const actionable: EmailActionable = {
      actionableID,
      issueDate,
      expiryDate: new Date(issueDate.getTime() + getExpiryMs(type)),
      userID,
      email,
      type,
    };

    const result = await db.collection<EmailActionable>(DatabaseCollections.emailActionables).insertOne(actionable);

    if (!result.acknowledged) return { ok: false, error: 'internalServerError' };

    return { ok: true, data: { actionableID } };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function findValidEmailActionable(
  {
    actionableID,
    type,
  }: {
    actionableID: string;
    type: EmailActionable['type'];
  },
): Promise<FunctionResponse<EmailActionable>> {
  try {
    const { db } = getGlobalObject();

    const actionable = await db.collection<EmailActionable>(DatabaseCollections.emailActionables).findOne({
      actionableID,
      type,
      expiryDate: { $gt: new Date() },
      accessedDate: { $exists: false },
      deactivatedAt: { $exists: false },
    });

    if (!actionable) return { ok: false, error: 'notFound' };

    return { ok: true, data: actionable };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function markEmailActionableAccessed(
  actionableID: string,
): Promise<FunctionResponse<void>> {
  try {
    const { db } = getGlobalObject();

    const result = await db.collection<EmailActionable>(DatabaseCollections.emailActionables).findOneAndUpdate(
      {
        actionableID,
        accessedDate: { $exists: false },
        deactivatedAt: { $exists: false },
      },
      {
        $set: {
          accessedDate: new Date(),
        },
      },
    );

    if (!result) return { ok: false, error: 'notFound' };

    return { ok: true, data: undefined };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}
