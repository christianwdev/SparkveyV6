import { Suspense } from 'react';
import AuthenticationLayout from '../_components/AuthenticationLayout/AuthenticationLayout';
import ConfirmEmailChangeClient from './page.client';

export default function ConfirmEmailChangePage() {
  return (
    <AuthenticationLayout>
      <Suspense fallback={null}>
        <ConfirmEmailChangeClient />
      </Suspense>
    </AuthenticationLayout>
  );
}
