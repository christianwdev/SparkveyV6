import AuthenticationLayout from '../_components/AuthenticationLayout/AuthenticationLayout';
import LoginPageClient from './page.client';

export default function LoginPage() {
  return (
    <AuthenticationLayout>
      <LoginPageClient />
    </AuthenticationLayout>
  );
}
