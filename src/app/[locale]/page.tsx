import LandingPage from '@components/LandingPage/LandingPage';
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';
import HomePage from '@components/HomePage/HomePage';

export default async function Page() {
  const user = await getUser({ request: serverRequest });

  if (!user) {
    return <LandingPage />;
  }

  return <HomePage />;
}