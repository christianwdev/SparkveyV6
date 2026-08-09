import { redirect } from 'next/navigation';

// Utils
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';

async function checkUserAuthentication() {
  const user = await getUser({ request: serverRequest });

  return !!user;
}

export default async function RequireUserAuthentication({
  children,
}: {
  children: React.ReactNode
}) {
  const isAuthenticated = await checkUserAuthentication();

  if (!isAuthenticated) {
    return redirect('/login');
  }

  return <>{children}</>;
}
