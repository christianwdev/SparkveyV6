import { z } from 'zod';
import { ANNOUNCEMENT_MESSAGE_MAX_LENGTH } from 'types/Settings/AnnouncementSettings';

export const adminAnnouncementCreateBodySchema = z.object({
  message: z.string().trim().min(1).max(ANNOUNCEMENT_MESSAGE_MAX_LENGTH),
});
