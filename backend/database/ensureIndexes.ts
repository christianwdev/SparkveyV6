import DatabaseCollections from '../constants/DatabaseCollections';
import { ensureSiteStatistics } from '../utils/siteStatistics';

import type { Db } from 'mongodb';

export default async function ensureIndexes(db: Db): Promise<void> {
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
    {
      key: { creationDate: -1 },
      name: 'creationDate',
    },
    {
      key: { 'referralInformation.referredByID': 1, creationDate: -1 },
      partialFilterExpression: { 'referralInformation.referredByID': { $exists: true } },
      name: 'referredByID_creationDate',
    },
  ]);

  await db.collection(DatabaseCollections.deletedAccountFingerprints).createIndexes([
    {
      key: { emailHash: 1 },
      unique: true,
      name: 'emailHash_unique',
    },
    {
      key: { userID: 1, deletedAt: -1 },
      name: 'userID_deletedAt',
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

  await db.collection(DatabaseCollections.affiliateCodes).createIndexes([
    {
      key: { code: 1 },
      unique: true,
      partialFilterExpression: { disabledAt: null },
      name: 'code_unique_when_active',
    },
    {
      key: { userID: 1, createdAt: -1 },
      name: 'userID_createdAt',
    },
    {
      key: { totalEarnings: -1 },
      name: 'totalEarnings',
    },
  ]);

  await db.collection(DatabaseCollections.userRedemptions).createIndexes([
    {
      key: { redemptionID: 1 },
      unique: true,
      name: 'redemptionID_unique',
    },
    {
      key: { status: 1, createdAt: -1 },
      name: 'status_createdAt',
    },
    {
      key: { userID: 1, status: 1 },
      name: 'userID_status',
    },
    {
      key: { 'meta.walletAddress': 1, userID: 1 },
      sparse: true,
      name: 'walletAddress_userID',
    },
  ]);

  await db.collection(DatabaseCollections.userSessions).createIndexes([
    {
      key: { userID: 1, issueDate: 1 },
      name: 'userID_issueDate',
    },
    {
      key: { ipAddresses: 1, userID: 1 },
      name: 'ipAddresses_userID',
    },
  ]);

  await db.collection(DatabaseCollections.userFlags).createIndexes([
    {
      key: { userID: 1, type: 1, instanceKey: 1 },
      unique: true,
      name: 'userID_type_instanceKey_unique',
    },
    {
      key: { userID: 1, status: 1, createdAt: -1 },
      name: 'userID_status_createdAt',
    },
  ]);

  await db.collection(DatabaseCollections.withdrawalAttestations).createIndexes([
    {
      key: { attestationID: 1 },
      unique: true,
      name: 'attestationID_unique',
    },
  ]);

  // Backfill geoUnrestricted on offers ingested before the field was introduced.
  // Uses geos.0 dot-notation (whether first element exists) — runs instantly after
  // the first startup because geoUnrestricted:{$exists:false} matches nothing.
  await Promise.all([
    db.collection(DatabaseCollections.offers).updateMany(
      { geoUnrestricted: { $exists: false }, 'geos.0': { $exists: false } },
      { $set: { geoUnrestricted: true } },
    ),
    db.collection(DatabaseCollections.offers).updateMany(
      { geoUnrestricted: { $exists: false }, 'geos.0': { $exists: true } },
      { $set: { geoUnrestricted: false } },
    ),
  ]);

  await db.collection(DatabaseCollections.offers).createIndexes([
    {
      key: { offerID: 1, provider: 1 },
      unique: true,
      name: 'offerID_provider_unique',
    },
    {
      key: { status: 1, provider: 1, updatedAt: 1 },
      name: 'status_provider_updatedAt',
    },
    {
      key: { status: 1, geos: 1 },
      name: 'status_geos',
    },
    {
      key: { status: 1, offerType: 1 },
      name: 'status_offerType',
    },

    // getFeaturedOffers sort
    {
      key: { status: 1, featuredPriority: 1 },
      sparse: true,
      name: 'status_featuredPriority',
    },

    // recentGeoFill branch A: geo-unrestricted offers sorted by recency
    {
      key: { status: 1, geoUnrestricted: 1, updatedAt: -1 },
      name: 'status_geoUnrestricted_updatedAt',
    },

    // recentGeoFill branch A with offerType: typed geo-unrestricted fills
    {
      key: { status: 1, geoUnrestricted: 1, offerType: 1, updatedAt: -1 },
      name: 'status_geoUnrestricted_offerType_updatedAt',
    },

    // recentGeoFill branch B: country-specific offers sorted by recency
    // geos is multikey; updatedAt as trailing key covers the sort so no in-memory sort is needed.
    {
      key: { status: 1, geos: 1, updatedAt: -1 },
      name: 'status_geos_updatedAt',
    },
  ]);

  const userEarnings = db.collection(DatabaseCollections.userEarnings);

  await userEarnings.createIndexes([
    {
      key: { provider: 1, conversionID: 1 },
      name: 'provider_conversionID_unique',
      unique: true,
    },
    {
      key: { type: 1, status: 1, createdAt: -1, offerID: 1 },
      name: 'type_status_createdAt_offerID',
    },
    {
      key: { userID: 1, type: 1, createdAt: -1 },
      name: 'userID_type_createdAt',
    },
    {
      key: { status: 1, createdAt: -1 },
      name: 'status_createdAt',
    },
  ]);

  await userEarnings.createIndex(
    { type: 1, status: 1, heldUntil: 1 },
    {
      name: 'type_status_heldUntil',
      partialFilterExpression: { type: 'offer', status: 'held', heldUntil: { $exists: true } },
    },
  );

  await db.collection(DatabaseCollections.chatConversations).createIndexes([
    {
      key: { conversationID: 1 },
      unique: true,
      name: 'conversationID_unique',
    },
    {
      key: { userID: 1 },
      unique: true,
      name: 'userID_unique',
    },
    {
      key: { lastMessageTimestamp: -1 },
      name: 'lastMessageTimestamp',
    },
  ]);

  await db.collection(DatabaseCollections.chatMessages).createIndexes([
    {
      key: { messageID: 1 },
      unique: true,
      name: 'messageID_unique',
    },
    {
      key: { conversationID: 1, timestamp: -1 },
      name: 'conversationID_timestamp',
    },
  ]);

  await ensureSiteStatistics(db);
}
