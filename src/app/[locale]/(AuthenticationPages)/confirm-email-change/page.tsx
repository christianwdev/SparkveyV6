import AuthenticationLayout from '../_components/AuthenticationLayout/AuthenticationLayout';
import ConfirmEmailChangeClient from './page.client';

export default function ConfirmEmailChangePage() {
  return (
    <AuthenticationLayout>
      <ConfirmEmailChangeClient />
    </AuthenticationLayout>
  );
}
