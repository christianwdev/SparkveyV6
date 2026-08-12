import { redirect } from 'next/navigation';

// Utils
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';

// Types
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

async function checkAdminAuthentication() {
  const user = await getUser({ request: serverRequest });

  if (!user) return false;

  const permissions = user.staffPermissions ?? StaffPermissions.NONE;

  return permissions !== StaffPermissions.NONE;
}

export default async function RequireAdminAuthentication({
  children,
}: {
  children: React.ReactNode
}) {
  const isAdmin = await checkAdminAuthentication();

  if (!isAdmin) {
    return redirect('/');
  }

  return <>{children}</>;
}
