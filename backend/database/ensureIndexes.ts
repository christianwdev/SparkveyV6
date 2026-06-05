import DatabaseCollections from '../constants/DatabaseCollections';

import type { Db } from 'mongodb';

export default async function ensureIndexes(db: Db): Promise<void> {
  await db.collection(DatabaseCollections.users).dropIndex('username_unique').catch(() => {});

  await db.collection(DatabaseCollections.users).createIndexes([
    {
      key: { userID: 1 },
      unique: true,
      name: 'userID_unique',
    },
    {
      key: { 'emailInformation.emailAddress': 1 },
      unique: true,
      sparse: true,
      name: 'emailAddress_unique',
    },
    {
      key: { 'socialInformation.google.emailAddress': 1 },
      sparse: true,
      name: 'googleEmailAddress',
    },
    {
      key: { 'socialInformation.google.id': 1 },
      unique: true,
      sparse: true,
      name: 'googleId_unique',
    },
  ]);

  await db.collection(DatabaseCollections.postbackLogs).createIndexes([
    {
      key: { requestID: 1 },
      name: 'requestID',
    },
    {
      key: { status: 1, date: -1 },
      name: 'status_date',
    },
    {
      key: { provider: 1, failureReason: 1 },
      name: 'provider_failureReason',
    },
  ]);

  await db.collection(DatabaseCollections.rewards).createIndexes([
    {
      key: { rewardID: 1, providerName: 1 },
      unique: true,
      name: 'rewardID_providerName_unique',
    },
  ]);

  await db.collection(DatabaseCollections.emailActionables).createIndexes([
    {
      key: { actionableID: 1 },
      unique: true,
      name: 'actionableID_unique',
    },
    {
      key: { userID: 1, type: 1, deactivatedAt: 1 },
      name: 'userID_type_deactivatedAt',
    },
  ]);
}
