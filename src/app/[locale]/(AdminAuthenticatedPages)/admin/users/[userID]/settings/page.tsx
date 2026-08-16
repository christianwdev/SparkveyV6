import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { serverRequest } from '@utils/serverRequest';
import { createQueryClient } from '@contexts/queryClient';
import { adminUserQueryOptions } from '@hooks/adminUserQueries';
import AdminUserSettingsClient from './page.client';

type PageProps = {
  params: Promise<{ locale: string, userID: string }>,
};

export default async function AdminUserSettingsPage({ params }: PageProps) {
  const { userID } = await params;
  const queryClient = createQueryClient();

  await queryClient.prefetchQuery(adminUserQueryOptions({
    request: serverRequest,
    userID,
  }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminUserSettingsClient userID={userID} />
    </HydrationBoundary>
  );
}
