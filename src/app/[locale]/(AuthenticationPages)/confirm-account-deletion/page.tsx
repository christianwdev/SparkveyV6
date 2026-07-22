import { Suspense } from 'react';
import AuthenticationLayout from '../_components/AuthenticationLayout/AuthenticationLayout';
import ConfirmAccountDeletionClient from './page.client';

export default function ConfirmAccountDeletionPage() {
  return (
    <AuthenticationLayout>
      <Suspense fallback={null}>
        <ConfirmAccountDeletionClient />
      </Suspense>
    </AuthenticationLayout>
  );
}
