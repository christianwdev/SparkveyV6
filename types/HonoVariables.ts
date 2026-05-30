import type { Db } from 'mongodb';
import type InternalUser from './InternalUser';
import type UserSession from './UserSession';

type HonoVariables = {
  db: Db,
  user?: InternalUser,
  session?: UserSession,
};

export default HonoVariables;
