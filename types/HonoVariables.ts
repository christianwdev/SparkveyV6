import type { Db } from 'mongodb';
import type InternalUser from './User/InternalUser';
import type UserSession from './UserSession';

type HonoVariables = {
  db: Db,
  user?: InternalUser,
  session?: UserSession,
};

export default HonoVariables;
