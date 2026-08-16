import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { serverRequest } from '@utils/serverRequest';
import { createQueryClient } from '@contexts/queryClient';
import { adminUserSessionsQueryOptions } from '@hooks/adminUserQueries';
import AdminUserSessionsClient from './page.client';

type PageProps = {
  params: Promise<{ locale: string, userID: string }>,
};

export default async function AdminUserSessionsPage({ params }: PageProps) {
  const { userID } = await params;
  const queryClient = createQueryClient();

  await queryClient.prefetchQuery(adminUserSessionsQueryOptions({
    request: serverRequest,
    userID,
    page: 1,
    activeOnly: false,
  }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminUserSessionsClient userID={userID} />
    </HydrationBoundary>
  );
}
