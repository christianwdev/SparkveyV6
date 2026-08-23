// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';

// Types
import type FunctionResponse from 'types/FunctionResponse';
import type ActiveAnnouncement from 'types/Announcement/ActiveAnnouncement';
import type AnnouncementSettings from 'types/Settings/AnnouncementSettings';

export type GetActiveAnnouncementError = 'internalServerError';
export type ListAnnouncementError = 'internalServerError';
export type UpsertAnnouncementError = 'internalServerError';
export type DisableAnnouncementError = 'notFound' | 'internalServerError';

const ANNOUNCEMENT_TYPE = 'announcement' as const;

export async function getActiveAnnouncement(): Promise<
  FunctionResponse<ActiveAnnouncement | null, GetActiveAnnouncementError>
> {
  try {
    const { db } = getGlobalObject();
    const announcement = await db.collection<AnnouncementSettings>(DatabaseCollections.settings).findOne({
      type: ANNOUNCEMENT_TYPE,
      active: true,
    });

    if (!announcement) return { ok: true, data: null };

    return {
      ok: true,
      data: {
        message: announcement.message,
      },
    };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function listAnnouncement(): Promise<
  FunctionResponse<AnnouncementSettings[], ListAnnouncementError>
> {
  try {
    const { db } = getGlobalObject();
    const announcement = await db.collection<AnnouncementSettings>(DatabaseCollections.settings).findOne({
      type: ANNOUNCEMENT_TYPE,
    });

    return {
      ok: true,
      data: announcement ? [ sanitizeAnnouncement(announcement) ] : [],
    };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function upsertAnnouncement(
  {
    message,
  }: {
    message: string,
  },
): Promise<FunctionResponse<AnnouncementSettings, UpsertAnnouncementError>> {
  try {
    const { db } = getGlobalObject();
    const announcement: AnnouncementSettings = {
      type: ANNOUNCEMENT_TYPE,
      message,
      active: true,
      createdAt: new Date(),
    };

    const result = await db.collection<AnnouncementSettings>(DatabaseCollections.settings).findOneAndUpdate(
      { type: ANNOUNCEMENT_TYPE },
      { $set: announcement },
      { upsert: true, returnDocument: 'after' },
    );

    if (!result) return { ok: false, error: 'internalServerError' };

    return { ok: true, data: sanitizeAnnouncement(result) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function disableAnnouncement(): Promise<
  FunctionResponse<AnnouncementSettings, DisableAnnouncementError>
> {
  try {
    const { db } = getGlobalObject();
    const result = await db.collection<AnnouncementSettings>(DatabaseCollections.settings).findOneAndUpdate(
      { type: ANNOUNCEMENT_TYPE },
      { $set: { active: false } },
      { returnDocument: 'after' },
    );

    if (!result) return { ok: false, error: 'notFound' };

    return { ok: true, data: sanitizeAnnouncement(result) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

function sanitizeAnnouncement(doc: AnnouncementSettings): AnnouncementSettings {
  return {
    type: 'announcement',
    message: doc.message,
    active: doc.active,
    createdAt: doc.createdAt,
  };
}
