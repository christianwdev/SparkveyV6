import { redirect } from 'next/navigation';

// Utils
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';

async function checkAdminAuthentication() {
  const user = await getUser({ request: serverRequest });

  if (!user) return false;

  return false;
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
