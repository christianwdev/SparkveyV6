export const ANNOUNCEMENT_MESSAGE_MAX_LENGTH = 500;

type AnnouncementSettings = {
  type: 'announcement',
  message: string,
  active: boolean,
  createdAt: Date,
};

export default AnnouncementSettings;
