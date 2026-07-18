import DatabaseCollections from '../constants/DatabaseCollections';
import { ensureSiteStatistics } from '../utils/siteStatistics';

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

  await db.collection(DatabaseCollections.userEarnings).createIndexes([
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

  await ensureSiteStatistics(db);
}
