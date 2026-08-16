import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { serverRequest } from '@utils/serverRequest';
import { createQueryClient } from '@contexts/queryClient';
import { adminUserTransactionsQueryOptions } from '@hooks/adminUserQueries';
import AdminUserTransactionsClient from './page.client';

type PageProps = {
  params: Promise<{ locale: string, userID: string }>,
};

export default async function AdminUserTransactionsPage({ params }: PageProps) {
  const { userID } = await params;
  const queryClient = createQueryClient();

  await queryClient.prefetchQuery(adminUserTransactionsQueryOptions({
    request: serverRequest,
    userID,
    page: 1,
  }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminUserTransactionsClient userID={userID} />
    </HydrationBoundary>
  );
}
