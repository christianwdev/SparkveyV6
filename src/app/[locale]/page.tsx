import LandingPage from '@components/LandingPage/LandingPage';
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';

export default async function Page() {
  const user = await getUser({ request: serverRequest });

  if (!user) {
    return <LandingPage />;
  }

  return <p>Logged in</p>;
}