import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { serverRequest } from '@utils/serverRequest';
import { createQueryClient } from '@contexts/queryClient';
import { adminUserEmailsQueryOptions } from '@hooks/adminUserQueries';
import AdminUserEmailsClient from './page.client';

type PageProps = {
  params: Promise<{ locale: string, userID: string }>,
};

export default async function AdminUserEmailsPage({ params }: PageProps) {
  const { userID } = await params;
  const queryClient = createQueryClient();

  await queryClient.prefetchQuery(adminUserEmailsQueryOptions({
    request: serverRequest,
    userID,
    page: 1,
  }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminUserEmailsClient userID={userID} />
    </HydrationBoundary>
  );
}
